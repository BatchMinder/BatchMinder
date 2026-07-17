import Upload from '../models/upload.js';
import Student from '../models/student.js';
import Batch from '../models/batch.js';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { logAudit, logNotification } from '../utils/logger.js';
import { scopeToUserDepartments } from '../middleware/scopeMiddleware.js';

export const validateUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const { departmentId } = req.body;
    if (!departmentId) {
      return res.status(400).json({ message: 'Please provide departmentId' });
    }

    // Security check: ensure requesting user has access to this department
    if (req.user.role !== 'dean') {
      const scope = scopeToUserDepartments(req);
      const allowed = scope.departmentId && scope.departmentId.$in
        ? scope.departmentId.$in.some(id => id.toString() === departmentId.toString())
        : false;
      if (!allowed) {
        return res.status(403).json({ message: 'Department not in your scope' });
      }
    }

    const rows = [];
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => rows.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    if (rows.length === 0) {
      return res.status(400).json({ message: 'CSV file is empty' });
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
      const batchCode = (row.batch || row.Batch || '').toString().trim().toUpperCase();
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

      if (!batchCode) {
        errors.push({ row: i + 1, field: 'batch', message: 'Batch code is required' });
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
        validRows.push({ rollNumber, name, email, batchCode, cgpa });
      }
    }

    const upload = await Upload.create({
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      departmentId,
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

    const batches = await Batch.find({ departmentId: upload.departmentId });
    const batchMap = {};
    for (const b of batches) {
      batchMap[b.code.toUpperCase()] = b._id;
    }

    let importedCount = 0;
    const importErrors = [];
    const studentsToCreate = [];

    for (const row of upload.parsedData) {
      const batchId = batchMap[row.batchCode];
      if (!batchId) {
        importErrors.push({ row: 0, field: 'batch', message: `Batch code ${row.batchCode} not found for department` });
        continue;
      }

      const existing = await Student.findOne({ rollNumber: row.rollNumber });
      if (existing) {
        importErrors.push({ row: 0, field: 'rollNumber', message: `Roll number ${row.rollNumber} already exists` });
        continue;
      }

      studentsToCreate.push({
        rollNumber: row.rollNumber,
        name: row.name,
        email: row.email || undefined,
        departmentId: upload.departmentId,
        batchId,
        cgpa: row.cgpa,
      });
    }

    if (studentsToCreate.length > 0) {
      await Student.insertMany(studentsToCreate);
      importedCount = studentsToCreate.length;

      // Notify for any imported student with critical or warning standing
      for (const s of studentsToCreate) {
        const standing = Student.computeCgpaStatus(s.cgpa);
        if (standing === 'warning' || standing === 'critical') {
          await logNotification({
            type: standing,
            message: `Student ${s.name} (${s.rollNumber}) imported in ${standing} standing (CGPA: ${s.cgpa}).`,
            departmentId: upload.departmentId.toString(),
            batchId: s.batchId.toString(),
            deepLinkUrl: `/admin/students`
          });
        }
      }
    }

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
