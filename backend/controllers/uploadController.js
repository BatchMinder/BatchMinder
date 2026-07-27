import Upload from '../models/upload.js';
import Student from '../models/student.js';
import Batch from '../models/batch.js';
import csv from 'csv-parser';
import xlsx from 'xlsx';
import { Readable } from 'stream';
import { logAudit, logNotification } from '../utils/logger.js';
import { scopeToUserDepartments } from '../middleware/scopeMiddleware.js';

export const validateUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const { departmentId, batchId, intakeSession } = req.body;
    const semester = parseInt(req.body.semester, 10);

    if (!departmentId) {
      return res.status(400).json({ message: 'Please provide departmentId' });
    }
    if (!batchId) {
      return res.status(400).json({ message: 'Please select a batch' });
    }
    if (isNaN(semester) || semester < 1 || semester > 8) {
      return res.status(400).json({ message: 'Please select a valid semester (1-8)' });
    }

    // Security check: ensure requesting user has access to this department
    if (req.user.role !== 'dean') {
      const scope = scopeToUserDepartments(req);
      // If scope has a departmentId restriction, enforce it.
      // If scope is empty (e.g. admin with no specific dept restriction), allow access.
      if (scope.departmentId && scope.departmentId.$in) {
        const allowed = scope.departmentId.$in.some(id => id.toString() === departmentId.toString());
        if (!allowed) {
          return res.status(403).json({ message: 'Department not in your scope' });
        }
      }
    }

    // Confirm the selected batch actually exists and belongs to this department
    const batchDoc = await Batch.findOne({ _id: batchId, departmentId });
    if (!batchDoc) {
      return res.status(400).json({ message: 'Selected batch was not found in this department' });
    }

    const rows = [];
    const isExcel = /\.(xlsx|xls)$/i.test(req.file.originalname)
      || (req.file.mimetype && (req.file.mimetype.includes('spreadsheet') || req.file.mimetype.includes('excel')));

    if (isExcel) {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows.push(...xlsx.utils.sheet_to_json(sheet, { defval: '' }));
    } else {
      const stream = Readable.from(req.file.buffer.toString());
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => rows.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({ message: 'File is empty' });
    }

    const errors = [];
    const validRows = [];
    const seenRollNumbers = new Set();
    let duplicateCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rollNumber = (row.rollNumber || row.RollNumber || '').toString().trim().toUpperCase();
      const name = (row.name || row.Name || '').toString().trim();
      const email = (row.email || row.Email || '').toString().trim().toLowerCase();
      const cgpa = parseFloat(row.cgpa || row.CGPA || 0);

      let rowValid = true;

      if (!rollNumber) {
        errors.push({ row: i + 1, field: 'rollNumber', message: 'Roll number is required' });
        rowValid = false;
      }

      if (!name) {
        errors.push({ row: i + 1, field: 'name', message: 'Name is required' });
        rowValid = false;
      }

      if (isNaN(cgpa) || cgpa < 0 || cgpa > 4.0) {
        errors.push({ row: i + 1, field: 'cgpa', message: 'CGPA must be between 0 and 4.0' });
        rowValid = false;
      }

      if (seenRollNumbers.has(rollNumber)) {
        errors.push({ row: i + 1, field: 'rollNumber', message: 'Duplicate roll number in file' });
        duplicateCount++;
        rowValid = false;
      }
      seenRollNumbers.add(rollNumber);

      if (rowValid) {
        validRows.push({ rollNumber, name, email, cgpa });
      }
    }

    const upload = await Upload.create({
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      departmentId,
      batchId,
      semester,
      intakeSession: intakeSession || 'Fall',
      status: 'processing',
      totalRecords: rows.length,
      validRecords: validRows.length,
      errorCount: errors.length,
      duplicateCount,
      errors: errors.slice(0, 200),
      parsedData: validRows,
    });

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'UPLOAD_VALIDATED',
      targetType: 'Upload',
      targetId: upload._id.toString(),
      departmentId: departmentId.toString(),
      metadata: {
        description: `Validated ${req.file.originalname}: ${validRows.length} valid, ${errors.length} errors`,
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        uploadId: upload._id,
        fileName: req.file.originalname,
        totalRecords: rows.length,
        validRecords: validRows.length,
        errorCount: errors.length,
        duplicateCount,
        errors: errors.slice(0, 100),
        validPreview: validRows.slice(0, 20),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const importValidRows = async (req, res) => {
  try {
    const { id } = req.params;

    const upload = await Upload.findById(id);
    if (!upload) {
      return res.status(404).json({ message: 'Upload record not found' });
    }

    if (upload.status === 'complete') {
      return res.status(400).json({ message: 'Upload already imported' });
    }

    if (upload.parsedData.length === 0) {
      return res.status(400).json({ message: 'No valid rows to import' });
    }

    let importedCount = 0;
    const importErrors = [];

    // IMPORTANT: create students one-by-one with Student.create()/.save()
    // instead of Student.insertMany(). insertMany() does NOT run Mongoose
    // 'save' middleware, which silently broke three things for every
    // CSV/Excel-imported student:
    //   1. cgpaStatus was never computed (stayed at the schema default
    //      'good' even for Critical/Warning CGPAs).
    //   2. No DegreeProgress document was ever created for them.
    //   3. The FR-3.5 advisor CGPA-alert notification (in-app + email)
    //      never fired, because that logic lives in the post('save') hook.
    // Using .create() runs the full pre/post 'save' pipeline (see
    // models/student.js), so all three now happen automatically and
    // consistently with every other student-creation path in the app.
    for (const row of upload.parsedData) {
      const existing = await Student.findOne({ rollNumber: row.rollNumber });
      if (existing) {
        importErrors.push({ row: 0, field: 'rollNumber', message: `Roll number ${row.rollNumber} already exists` });
        continue;
      }

      try {
        await Student.create({
          rollNumber: row.rollNumber,
          name: row.name,
          email: row.email || undefined,
          departmentId: upload.departmentId,
          batchId: upload.batchId,
          cgpa: row.cgpa,
          currentSemester: upload.semester,
          intakeSession: upload.intakeSession,
        });
        importedCount++;
      } catch (err) {
        importErrors.push({ row: 0, field: 'rollNumber', message: `Failed to import ${row.rollNumber}: ${err.message}` });
      }
    }

    // Note: no manual CGPA-alert notification loop is needed here anymore —
    // Student.create() triggers the post('save') hook in models/student.js,
    // which already evaluates thresholds and sends the Warning/Critical
    // notification (in-app + email) per student. Doing it again here would
    // just double-send the same alert.

    upload.status = 'complete';
    upload.validRecords = importedCount;
    upload.errorCount = importErrors.length;
    upload.errors = upload.errors.concat(importErrors.map(e => ({
      row: e.row,
      field: e.field,
      message: e.message,
    })));
    await upload.save();

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'UPLOAD_IMPORTED',
      targetType: 'Upload',
      targetId: upload._id.toString(),
      departmentId: upload.departmentId.toString(),
      metadata: {
        description: `Imported ${importedCount} students from ${upload.fileName}`,
        importedCount,
        errorCount: importErrors.length,
      },
    });

    // Notify CSV upload completion
    await logNotification({
      type: 'info',
      message: `CSV upload completed for ${upload.fileName}. Successfully imported ${importedCount} students.`,
      departmentId: upload.departmentId.toString(),
      deepLinkUrl: `/admin/upload`
    });

    res.status(200).json({
      status: 'success',
      data: {
        importedCount,
        errorCount: importErrors.length,
        errors: importErrors,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUploadHistory = async (req, res) => {
  try {
    const uploads = await Upload.find({ uploadedBy: req.user._id })
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ status: 'success', data: { uploads } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};