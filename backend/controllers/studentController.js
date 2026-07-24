import mongoose from 'mongoose';
import Student from '../models/student.js';
import Batch from '../models/batch.js';
import Curriculum from '../models/curriculum.js';
import Department from '../models/department.js';
import DegreeProgress from '../models/degreeProgress.js';
import { scopeToUserDepartments } from '../middleware/scopeMiddleware.js';
import { logAudit, logNotification } from '../utils/logger.js';
import xlsx from 'xlsx';
import { calculateSTMU_CGPA } from '../utils/stmuGrading.js';

// Auto-generates a unique, conflict-free roll number for a new real student,
// in the standard STMU-style format: {BatchCode}-{4-digit sequence}
// e.g. BSCS-2023-0014. Sequence is based on how many students already exist
// in that batch, then verified unique with a retry loop (handles the rare
// race condition where two students are created in the same instant).
const generateRollNumber = async (batchDoc) => {
  let attempt = 0;
  while (attempt < 5) {
    const count = await Student.countDocuments({ batchId: batchDoc._id });
    const candidate = `${batchDoc.code}-${String(count + 1 + attempt).padStart(4, '0')}`;
    const exists = await Student.findOne({ rollNumber: candidate });
    if (!exists) return candidate;
    attempt++;
  }
  // Extremely unlikely fallback if 5 sequential attempts all collided
  return `${batchDoc.code}-${Date.now().toString().slice(-6)}`;
};

// Helper function to auto-enroll HEC Curriculum courses for a student
const autoEnrollHECCourses = async (student) => {
  if (!student) return student;

  // If student already has enrolled courses, skip auto-enrollment
  if (student.courses && student.courses.length > 0) {
    return student;
  }

  // Find active HEC curriculum matching student's department or batch
  let curriculum = await Curriculum.findOne({ version: 'HEC-2025-BSCS' });
  if (!curriculum && student.batchId) {
    curriculum = await Curriculum.findOne({ batchId: student.batchId._id || student.batchId });
  }
  if (!curriculum && student.departmentId) {
    curriculum = await Curriculum.findOne({ departmentId: student.departmentId._id || student.departmentId });
  }

  if (!curriculum || !curriculum.courses || curriculum.courses.length === 0) {
    return student;
  }

  const targetSem = student.currentSemester || 1;
  const enrolledCourses = [];

  curriculum.courses.forEach(c => {
    if (c.semester <= targetSem) {
      const isPast = c.semester < targetSem;
      enrolledCourses.push({
        courseCode: c.code,
        courseTitle: c.title,
        creditHours: c.creditHours || 3,
        grade: isPast ? (student.cgpa >= 3.5 ? 'A' : student.cgpa >= 3.0 ? 'B+' : student.cgpa >= 2.0 ? 'C+' : 'C') : 'IP',
        enrollmentStatus: isPast ? 'completed' : 'enrolled',
        status: isPast ? 'completed' : 'enrolled',
        semester: c.semester
      });
    }
  });

  student.courses = enrolledCourses;
  student.curriculumID = curriculum._id;
  await student.save();

  return student;
};

export const getAllStudents = async (req, res) => {
  try {
    let scope = {};
    if (req.user) {
      scope = scopeToUserDepartments(req);
      if (scope._id === null) {
        return res.status(200).json({ status: 'success', data: { students: [] }, total: 0 });
      }
    }

    const { batchId, status, cgpaStatus, search, batch, department, semester, intakeSession, page = 1, limit = 50 } = req.query;
    const filter = { ...scope };

    if (batchId) filter.batchId = batchId;
    if (status) filter.status = { $regex: new RegExp(`^${status.trim()}$`, 'i') };
    if (cgpaStatus) filter.cgpaStatus = cgpaStatus;
    if (semester) {
      if (semester === 'graduated') {
        filter.status = 'graduated';
      } else {
        filter.currentSemester = Number(semester);
        if (!filter.status) {
          filter.status = { $ne: 'graduated' };
        }
      }
    }
    if (intakeSession) {
      const term = intakeSession.trim().toLowerCase();
      const codeLetter = term === 'spring' ? 'S' : 'F';
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { intakeSession: { $regex: new RegExp(`^${term}$`, 'i') } },
          { rollNumber: { $regex: new RegExp(`-[0-9]{2}${codeLetter}-`, 'i') } }
        ]
      });
    }

    if (batch) {
      const batchDoc = await Batch.findOne({
        $or: [
          { code: { $regex: new RegExp(`^${batch.trim()}$`, 'i') } },
          { code: { $regex: new RegExp(batch.trim(), 'i') } }
        ]
      });
      if (batchDoc) filter.batchId = batchDoc._id;
    }

    if (department) {
      const deptDoc = await Department.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${department.trim()}$`, 'i') } },
          { code: { $regex: new RegExp(`^${department.trim()}$`, 'i') } }
        ]
      });
      if (deptDoc) filter.departmentId = deptDoc._id;
    }

    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { rollNumber: { $regex: search, $options: 'i' } },
        ]
      });
    }

    const skip = (Number(page) - 1) * Number(limit);
    let students = await Student.find(filter)
      .populate('departmentId', 'name code')
      .populate('batchId', 'code startYear')
      .sort({ rollNumber: 1 })
      .skip(skip)
      .limit(Number(limit));

    // Auto-heal / auto-enroll HEC courses for any student missing course records
    for (let i = 0; i < students.length; i++) {
      if (!students[i].courses || students[i].courses.length === 0) {
        await autoEnrollHECCourses(students[i]);
      }
    }

    const total = await Student.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: students.length,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: { students },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const query = mongoose.isValidObjectId(req.params.id)
      ? { _id: req.params.id, ...scope }
      : { rollNumber: req.params.id, ...scope };

    let student = await Student.findOne(query)
      .populate('departmentId', 'name code')
      .populate('batchId', 'code startYear');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.courses || student.courses.length === 0) {
      await autoEnrollHECCourses(student);
    }

    res.status(200).json({ status: 'success', data: { student } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createStudent = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { rollNumber, name, email, departmentId, batchId, currentSemester, cgpa, intakeSession } = req.body;

    if (!name || !departmentId || !batchId) {
      return res.status(400).json({ message: 'Please provide name, departmentId, and batchId' });
    }

    if (scope.departmentId && scope.departmentId.$in) {
      const allowedDepts = scope.departmentId.$in.map(id => id.toString());
      if (!allowedDepts.includes(departmentId.toString())) {
        return res.status(403).json({ message: 'Department not in your scope' });
      }
    }

    let finalRollNumber;
    if (rollNumber && rollNumber.trim()) {
      // Manual roll number provided — still enforce no-conflict.
      finalRollNumber = rollNumber.toUpperCase().trim();
      const existing = await Student.findOne({ rollNumber: finalRollNumber });
      if (existing) {
        return res.status(400).json({ message: 'Student with this roll number already exists' });
      }
    } else {
      // No roll number given — auto-generate a conflict-free one from the batch.
      const batchDoc = await Batch.findById(batchId);
      if (!batchDoc) {
        return res.status(404).json({ message: 'Batch not found — cannot auto-generate roll number' });
      }
      finalRollNumber = await generateRollNumber(batchDoc);
    }

    let student = await Student.create({
      rollNumber: finalRollNumber,
      name,
      email,
      departmentId,
      batchId,
      currentSemester: currentSemester || 1,
      cgpa: cgpa !== undefined ? cgpa : 0.0,
      intakeSession: intakeSession || (finalRollNumber?.toUpperCase().includes('S-') ? 'Spring' : 'Fall'),
    });

    // Auto-enroll official HEC Curriculum courses for the newly created student
    await autoEnrollHECCourses(student);

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'STUDENT_CREATED',
      targetType: 'Student',
      targetId: student._id.toString(),
      departmentId: departmentId.toString(),
      batchId: batchId.toString(),
      metadata: { description: `Created student ${student.name} (${student.rollNumber}) with HEC courses enrolled` },
    });

    if (student.cgpaStatus === 'warning' || student.cgpaStatus === 'critical') {
      await logNotification({
        type: student.cgpaStatus,
        message: `Student ${student.name} (${student.rollNumber}) created in ${student.cgpaStatus} standing (CGPA: ${student.cgpa}).`,
        departmentId: departmentId.toString(),
        batchId: batchId.toString(),
        deepLinkUrl: `/admin/students`
      });
    }

    res.status(201).json({ status: 'success', data: { student } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const query = mongoose.isValidObjectId(req.params.id)
      ? { _id: req.params.id, ...scope }
      : { rollNumber: req.params.id, ...scope };

    const existingStudent = await Student.findOne(query);
    if (!existingStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const oldCgpaStatus = existingStudent.cgpaStatus;

    const student = await Student.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    );

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'STUDENT_UPDATED',
      targetType: 'Student',
      targetId: student._id.toString(),
      departmentId: student.departmentId.toString(),
      batchId: student.batchId.toString(),
      metadata: { description: `Updated student ${student.name} (${student.rollNumber})` },
    });

    if (oldCgpaStatus !== student.cgpaStatus) {
      await logNotification({
        type: student.cgpaStatus === 'critical' ? 'critical' : (student.cgpaStatus === 'warning' ? 'warning' : 'info'),
        message: `Student ${student.name} (${student.rollNumber}) CGPA status changed from ${oldCgpaStatus} to ${student.cgpaStatus} (CGPA: ${student.cgpa}).`,
        departmentId: student.departmentId.toString(),
        batchId: student.batchId.toString(),
        deepLinkUrl: `/admin/students`
      });
    }

    res.status(200).json({ status: 'success', data: { student } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const query = mongoose.isValidObjectId(req.params.id)
      ? { _id: req.params.id, ...scope }
      : { rollNumber: req.params.id, ...scope };

    const student = await Student.findOneAndDelete(query);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'STUDENT_DELETED',
      targetType: 'Student',
      targetId: student._id.toString(),
      departmentId: student.departmentId.toString(),
      batchId: student.batchId.toString(),
      metadata: { description: `Deleted student ${student.name} (${student.rollNumber})` },
    });

    res.status(200).json({ status: 'success', message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkUploadStudents = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const body = req.body || {};
    const targetSemester = parseInt(body.semester) || 1;
    const selectedDeptName = body.department || 'Computer Science';
    const selectedBatchCode = body.batch || '2022';



    // Find dept and batch
    let selectedDept = await Department.findOne({ name: { $regex: new RegExp(`^${selectedDeptName}$`, 'i') } });
    if (!selectedDept) {
      selectedDept = await Department.findOne({ code: 'CS' }) || await Department.create({ name: selectedDeptName, code: 'CS', color: '#6366F1' });
    }
    let selectedBatchDoc = await Batch.findOne({ code: { $regex: new RegExp(selectedBatchCode, 'i') } });
    if (!selectedBatchDoc && selectedDept) {
      selectedBatchDoc = await Batch.create({
        code: selectedBatchCode,
        dept: selectedDept.name,
        departmentId: selectedDept._id,
        startYear: parseInt(selectedBatchCode) || 22,
        advisor: 'Unassigned',
      });
    }

    // Find active HEC curriculum
    let curriculum = null;
    if (selectedDeptName.toLowerCase().includes('computer science') || selectedDeptName.toLowerCase() === 'cs') {
      curriculum = await Curriculum.findOne({ version: 'HEC-2025-BSCS' });
    }

    if (!curriculum) {
      if (selectedBatchDoc) {
        curriculum = await Curriculum.findOne({ batchId: selectedBatchDoc._id });
      }
      if (!curriculum && selectedDept) {
        curriculum = await Curriculum.findOne({ departmentId: selectedDept._id });
      }
    }

    let rawStudentsData = [];
    const isExcel = req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls') || (req.file.mimetype && (req.file.mimetype.includes('spreadsheet') || req.file.mimetype.includes('excel')));

    if (isExcel) {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rawStudentsData = xlsx.utils.sheet_to_json(sheet);
    } else {
      // Strip UTF-8 BOM if present
      const csvStr = req.file.buffer.toString().replace(/^\uFEFF/, '');
      const lines = csvStr.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        return res.status(400).json({ message: 'Empty CSV' });
      }

      const headers = lines[0].split(',').map(h => h.trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const studentObj = {};
        headers.forEach((header, idx) => {
          studentObj[header] = values[idx];
        });
        rawStudentsData.push(studentObj);
      }
    }

    // Key normalization helper
    const normalizeKeys = (obj) => {
      const normalized = {};
      Object.keys(obj).forEach(k => {
        const clean = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (clean === 'rollnumber' || clean === 'roll' || clean === 'studentid' || clean === 'id') {
          normalized.rollNumber = obj[k];
        } else if (clean === 'fullname' || clean === 'name') {
          normalized.name = obj[k];
        } else if (clean === 'email' || clean === 'emailaddress') {
          normalized.email = obj[k];
        } else if (clean === 'department' || clean === 'dept') {
          normalized.department = obj[k];
        } else if (clean === 'batch' || clean === 'batchcode') {
          normalized.batch = obj[k];
        } else if (clean === 'semester' || clean === 'sem') {
          normalized.semester = obj[k];
        } else if (clean === 'cgpa' || clean === 'gpa') {
          normalized.cgpa = obj[k];
        } else if (clean === 'intakesession' || clean === 'intake' || clean === 'session' || clean === 'term') {
          normalized.intakeSession = obj[k];
        } else {
          normalized[k] = obj[k];
        }
      });
      return normalized;
    };

    // Validate all rows before saving any records to the database
    const errors = [];
    let validCount = 0;
    let duplicateCount = 0;
    const validStudentsData = [];
    const previewStudents = [];

    const gradesMap = [
      { name: 'A', gp: 4.0 },
      { name: 'B+', gp: 3.5 },
      { name: 'B', gp: 3.0 },
      { name: 'C+', gp: 2.5 },
      { name: 'C', gp: 2.0 }
    ];

    for (let idx = 0; idx < rawStudentsData.length; idx++) {
      const row = rawStudentsData[idx];
      const rowNum = idx + 2; // Index 0 is row #2 in the CSV sheet
      const data = normalizeKeys(row);

      let rowHasError = false;
      const rollStr = String(data.rollNumber || '').trim();
      if (!rollStr) {
        errors.push(`Row ${rowNum}: rollNumber - Registration number is required`);
        rowHasError = true;
      } else {
        const regNoRegex = /^[A-Za-z0-9]{2,6}-[A-Za-z0-9]{2,5}-[A-Za-z0-9]{3,5}$/;
        if (!regNoRegex.test(rollStr)) {
          errors.push(`Row ${rowNum}: rollNumber - Invalid format (e.g., BSCS-24F-0001)`);
          rowHasError = true;
        }
      }
      if (!data.name || !String(data.name).trim()) {
        errors.push(`Row ${rowNum}: name - Name is required`);
        rowHasError = true;
      }
      if (data.cgpa !== undefined && data.cgpa !== null && String(data.cgpa).trim() !== '') {
        const parsedCgpa = Number(data.cgpa);
        if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 4.0) {
          errors.push(`Row ${rowNum}: cgpa - Invalid CGPA. Must be between 0.0 and 4.0`);
          rowHasError = true;
        }
      }

      // Calculate CGPA dynamically based on selected semester
      let calculatedCgpa = 0.0;
      let totalPoints = 0;
      let totalCredits = 0;

      if (curriculum && curriculum.courses) {
        curriculum.courses.forEach(currCourse => {
          if (currCourse.semester < targetSemester) {
            // Stable simulated grade points based on roll number
            const randomHash = (data.rollNumber || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const gradeIdx = (randomHash + currCourse.code.charCodeAt(2)) % gradesMap.length;
            const chosen = gradesMap[gradeIdx];
            totalPoints += (chosen.gp * currCourse.creditHours);
            totalCredits += currCourse.creditHours;
          }
        });
      }

      if (totalCredits > 0) {
        calculatedCgpa = Math.round((totalPoints / totalCredits) * 100) / 100;
      }

      data.calculatedCgpa = calculatedCgpa;

      // Check for duplicate roll number within the uploaded file itself
      if (!rowHasError && data.rollNumber) {
        const alreadyInFile = validStudentsData.some(s => s.rollNumber === data.rollNumber);
        if (alreadyInFile) {
          errors.push(`Row ${rowNum}: rollNumber - Duplicate roll number in file`);
          rowHasError = true;
        }
      }

      // Check if student with this roll number already exists in the database
      if (!rowHasError && data.rollNumber) {
        const exists = await Student.findOne({ rollNumber: data.rollNumber });
        if (exists) {
          errors.push(`Row ${rowNum}: rollNumber - Student with roll number '${data.rollNumber}' already exists in the database`);
          rowHasError = true;
        }
      }

      if (!rowHasError) {
        validCount++;
        validStudentsData.push(data);
      }

      // Generate preview row data
      previewStudents.push({
        id: String(rowNum - 1),
        roll: data.rollNumber || '',
        name: data.name || '',
        dept: data.department || selectedDeptName,
        batch: data.batch || selectedBatchCode,
        sem: String(targetSemester),
        cgpa: targetSemester === 1 ? 'N/A' : calculatedCgpa.toFixed(2),
        status: rowHasError ? 'Invalid' : (calculatedCgpa < 2.0 && targetSemester > 1 ? 'At Risk' : 'Valid')
      });
    }

    // STRICT VALIDATION ENGINE: Block entire upload if any row has an error
    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation Engine Blocked Upload: Invalid data found.',
        errors: errors,
        validCount: 0
      });
    }

    // Save only valid student records to the database
    for (const data of validStudentsData) {
      let deptName = body.department || data.department || selectedDeptName;
      let dept = await Department.findOne({ name: { $regex: new RegExp(`^${deptName}$`, 'i') } });
      if (!dept) {
        dept = await Department.findOne({ code: 'CS' }) || await Department.create({ name: deptName, code: 'CS', color: '#6366F1' });
      }

      let batchCode = body.batch || data.batch || selectedBatchCode;
      let batch = await Batch.findOne({ code: { $regex: new RegExp(batchCode, 'i') } });
      if (!batch) {
        batch = await Batch.create({
          code: batchCode,
          dept: dept.name,
          departmentId: dept._id,
          startYear: parseInt(batchCode) || 2022,
          advisor: 'Unassigned',
        });
      }

      // Populate dynamic course history based on the selected semester
      const studentCourses = [];
      if (curriculum && curriculum.courses) {
        curriculum.courses.forEach(currCourse => {
          if (currCourse.semester < targetSemester) {
            const randomHash = (data.rollNumber || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const gradeIdx = (randomHash + currCourse.code.charCodeAt(2)) % gradesMap.length;
            const chosen = gradesMap[gradeIdx];

            studentCourses.push({
              courseCode: currCourse.code,
              courseTitle: currCourse.title,
              creditHours: currCourse.creditHours,
              semester: currCourse.semester,
              grade: chosen.name,
              enrollmentStatus: 'completed',
              status: 'completed'
            });
          } else if (currCourse.semester === targetSemester) {
            studentCourses.push({
              courseCode: currCourse.code,
              courseTitle: currCourse.title,
              creditHours: currCourse.creditHours,
              semester: currCourse.semester,
              grade: 'IP',
              enrollmentStatus: 'enrolled',
              status: 'enrolled'
            });
          }
        });
      }

      let student = await Student.findOne({ rollNumber: data.rollNumber });
      if (student) {
        student.name = data.name;
        if (data.email) student.email = data.email;
        student.departmentId = dept._id;
        student.batchId = batch._id;
        student.currentSemester = targetSemester;
        student.cgpa = data.calculatedCgpa;
        student.courses = studentCourses;
        student.status = 'active';
        await student.save();
      } else {
        student = await Student.create({
          rollNumber: data.rollNumber,
          name: data.name,
          email: data.email || `${data.name.toLowerCase().replace(/\s+/g, '.')}@stmu.edu.pk`,
          departmentId: dept._id,
          batchId: batch._id,
          currentSemester: targetSemester,
          cgpa: data.calculatedCgpa,
          courses: studentCourses,
          status: 'active'
        });
      }

      await logAudit({
        actorId: req.user?._id || new mongoose.Types.ObjectId(),
        actorRole: req.user?.role || 'advisor',
        action: 'STUDENT_INGESTED',
        targetType: 'Student',
        targetId: data.rollNumber,
        departmentId: dept._id.toString(),
        metadata: { description: `Bulk uploaded student ${data.name} for Department: ${dept.name} in Semester: ${targetSemester}` }
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Bulk upload processed successfully',
      data: {
        processed: rawStudentsData.length,
        upserted: validStudentsData.length - duplicateCount,
        modified: duplicateCount,
        errors,
        stats: {
          total: rawStudentsData.length,
          valid: validCount,
          errors: errors.length,
          duplicates: duplicateCount
        },
        students: previewStudents
      }
    });
  } catch (err) {
    next(err);
  }
};

export const syncLmsRecords = async (req, res, next) => {
  try {
    const { batch, department } = req.body;

    const dept = await Department.findOne({ name: department });
    const batchDoc = await Batch.findOne({ code: batch });

    if (!dept || !batchDoc) {
      return res.status(404).json({ message: 'Department or Batch not found' });
    }

    if (!process.env.MOCK_LMS_URL || !process.env.MOCK_LMS_API_KEY) {
      return res.status(503).json({ message: 'LMS sync is not configured on this server (MOCK_LMS_URL / MOCK_LMS_API_KEY missing).' });
    }

    const students = await Student.find({ departmentId: dept._id, batchId: batchDoc._id });
    let syncedCount = 0;
    let failedCount = 0;
    let promotedCount = 0;
    let graduatedCount = 0;
    const notPromoted = [];

    // CURRICULUM FIX: a Curriculum document is NOT one-per-semester — it's
    // one document per program/department, holding every semester's courses
    // embedded together (each course tagged with its own `semester`). It's
    // linked to a batch via Batch.curriculumVersionId, NOT via
    // Curriculum.batchId (that field can point to an unrelated seed batch).
    // Fetch it once here instead of querying per-student per-semester.
    const curriculumDoc = batchDoc.curriculumVersionId
      ? await Curriculum.findById(batchDoc.curriculumVersionId)
      : null;

    for (const student of students) {
      if (student.status === 'graduated') continue;

      const inProgressCourses = student.courses.filter(
        c => c.grade === 'IP' || c.status === 'enrolled' || c.enrollmentStatus === 'enrolled'
      );

      // BUG FIX: this used to `continue` here when a student had nothing
      // new to sync (e.g. their courses were already resolved by an
      // earlier sync). That skipped the ENTIRE rest of the loop, including
      // the auto-promote check below — so already-resolved students could
      // never get auto-promoted, only ones actively mid-sync right now.
      // Now: only the LMS call + save is conditional; every non-graduated
      // student still falls through to the promotion check.
      if (inProgressCourses.length > 0) {
        // Real authenticated HTTP call to the (mock) external LMS, exactly the
        // pattern a genuine integration would use — API key auth, JSON payload.
        let lmsResponse;
        try {
          const apiRes = await fetch(`${process.env.MOCK_LMS_URL}/api/mock-lms/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.MOCK_LMS_API_KEY
            },
            body: JSON.stringify({
              rollNumber: student.rollNumber,
              courseCodes: inProgressCourses.map(c => c.courseCode)
            })
          });

          if (!apiRes.ok) {
            throw new Error(`LMS responded with status ${apiRes.status}`);
          }
          lmsResponse = await apiRes.json();
        } catch (err) {
          console.error(`LMS sync failed for student ${student.rollNumber}:`, err.message);
          failedCount++;
          continue;
        }

        const resultByCourse = new Map(lmsResponse.results.map(r => [r.courseCode, r]));

        student.courses = student.courses.map(course => {
          const lmsResult = resultByCourse.get(course.courseCode);
          if (!lmsResult) return course;
          return {
            ...course.toObject(),
            grade: lmsResult.grade,
            enrollmentStatus: lmsResult.status,
            status: lmsResult.status
          };
        });

        // BUG FIX: previously the CGPA field itself was never recalculated
        // after grades changed here — only cgpaStatus (the Warning/Critical
        // badge) got recomputed on save, from the OLD stale cgpa number.
        // A student's grades could change via sync and their CGPA/alert
        // status would silently never reflect it. Use the same canonical
        // STMU CGPA formula the migration flow already uses.
        student.cgpa = calculateSTMU_CGPA(student.courses);

        await student.save();
        syncedCount++;

        await logAudit({
          actorId: req.user?._id || new mongoose.Types.ObjectId(),
          actorRole: req.user?.role || 'admin',
          action: 'LMS_SYNCED',
          targetType: 'Student',
          targetId: student._id.toString(),
          departmentId: dept._id.toString(),
          metadata: { description: `Synced student ${student.name} courses from LMS for Department: ${dept.name}` }
        });
      }

      // AUTO-PROMOTE: if the student's CURRENT semester has no more
      // 'IP'/'enrolled' courses left — whether resolved just now or
      // already resolved earlier — the semester is effectively complete.
      // Promote them immediately instead of waiting for a separate manual
      // "Promote Semester" click. Same gate condition promoteSemester uses.
      const currentSemCourses = student.courses.filter(c => c.semester === student.currentSemester);
      const unresolvedCourses = currentSemCourses.filter(
        c => c.grade === 'IP' || c.status === 'enrolled' || c.enrollmentStatus === 'enrolled'
      );
      const stillUnresolved = unresolvedCourses.length > 0;

      if (!stillUnresolved) {
        const nextSem = student.currentSemester + 1;
        const nextSemCourses = curriculumDoc?.courses?.filter(c => c.semester === nextSem) || [];

        // No curriculum linked to this batch at all — we can't tell whether
        // the student has more semesters left, so don't guess. Skip
        // promotion and surface it clearly instead of silently graduating.
        if (!curriculumDoc) {
          notPromoted.push({
            rollNumber: student.rollNumber,
            name: student.name,
            currentSemester: student.currentSemester,
            reason: `No curriculum is linked to batch ${batchDoc.code} — cannot determine next semester's courses.`
          });
          continue;
        }

        // GRADUATION: curriculum exists, but has no courses for the next
        // semester — this was the student's final semester.
        if (nextSemCourses.length === 0) {
          student.status = 'graduated';
          await student.save();
          graduatedCount++;

          await logAudit({
            actorId: req.user?._id || new mongoose.Types.ObjectId(),
            actorRole: req.user?.role || 'admin',
            action: 'STUDENT_GRADUATED',
            targetType: 'Student',
            targetId: student._id.toString(),
            departmentId: dept._id.toString(),
            metadata: { description: `Marked student ${student.name} as graduated after completing Semester ${student.currentSemester} for Department: ${dept.name}` }
          });
          continue;
        }

        const newCourses = nextSemCourses.map(c => ({
          courseCode: c.code || c.courseCode,
          courseTitle: c.title || c.courseTitle,
          creditHours: c.creditHours,
          grade: 'IP',
          status: 'enrolled',
          enrollmentStatus: 'enrolled',
          semester: nextSem
        }));
        student.courses = student.courses.concat(newCourses);

        student.currentSemester = nextSem;
        await student.save();
        promotedCount++;

        await logAudit({
          actorId: req.user?._id || new mongoose.Types.ObjectId(),
          actorRole: req.user?.role || 'admin',
          action: 'BATCH_PROMOTED',
          targetType: 'Student',
          targetId: student._id.toString(),
          departmentId: dept._id.toString(),
          metadata: { description: `Auto-promoted student ${student.name} to Semester ${nextSem} after LMS sync for Department: ${dept.name}` }
        });
      } else {
        notPromoted.push({
          rollNumber: student.rollNumber,
          name: student.name,
          currentSemester: student.currentSemester,
          reason: currentSemCourses.length === 0
            ? `No courses recorded for Semester ${student.currentSemester} at all.`
            : `${unresolvedCourses.length} of ${currentSemCourses.length} Semester ${student.currentSemester} course(s) still unresolved: ${unresolvedCourses.map(c => `${c.courseCode} (grade: ${c.grade || 'none'})`).join(', ')}`
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: promotedCount > 0 || graduatedCount > 0
        ? `LMS synced successfully. Auto-promoted ${promotedCount} student(s), graduated ${graduatedCount} student(s).`
        : 'LMS synced successfully',
      syncedCount,
      failedCount,
      promotedCount,
      graduatedCount,
      notPromoted
    });
  } catch (err) {
    next(err);
  }
};

export const promoteSemester = async (req, res, next) => {
  try {
    const { batch, department } = req.body;

    const dept = await Department.findOne({ name: department });
    const batchDoc = await Batch.findOne({ code: batch });

    if (!dept || !batchDoc) {
      return res.status(404).json({ message: 'Department or Batch not found' });
    }

    const students = await Student.find({ departmentId: dept._id, batchId: batchDoc._id });
    const promotedCount = [];
    const skippedCount = [];
    const graduatedCount = [];

    // Same fix as syncLmsRecords: Curriculum is linked via
    // Batch.curriculumVersionId, not by matching Curriculum.batchId/semester.
    const curriculumDoc = batchDoc.curriculumVersionId
      ? await Curriculum.findById(batchDoc.curriculumVersionId)
      : null;

    for (const student of students) {
      if (student.status === 'graduated') continue;

      // GATE: previously this promoted every student unconditionally, even
      // if their current-semester courses were still 'IP' (never synced).
      // That let a batch get promoted with zero real grades ever recorded.
      // Now: any course still in-progress for the student's CURRENT
      // semester blocks that student's promotion until it's resolved
      // (via LMS sync or manual grade entry).
      const unresolvedCurrentSemCourses = student.courses.filter(
        c => c.semester === student.currentSemester &&
             (c.grade === 'IP' || c.status === 'enrolled' || c.enrollmentStatus === 'enrolled')
      );
      if (unresolvedCurrentSemCourses.length > 0) {
        skippedCount.push({
          rollNumber: student.rollNumber,
          name: student.name,
          reason: `${unresolvedCurrentSemCourses.length} unresolved course(s) in Semester ${student.currentSemester} — sync grades before promoting.`,
        });
        continue;
      }

      const nextSem = student.currentSemester + 1;
      const nextSemCourses = curriculumDoc?.courses?.filter(c => c.semester === nextSem) || [];

      if (!curriculumDoc) {
        skippedCount.push({
          rollNumber: student.rollNumber,
          name: student.name,
          reason: `No curriculum is linked to batch ${batchDoc.code} — cannot determine next semester's courses.`
        });
        continue;
      }

      // GRADUATION: curriculum exists but has no courses for the next
      // semester — mark graduated instead of promoting into a semester
      // with no courses.
      if (nextSemCourses.length === 0) {
        student.status = 'graduated';
        await student.save();
        graduatedCount.push(student.rollNumber);

        await logAudit({
          actorId: req.user?._id || new mongoose.Types.ObjectId(),
          actorRole: req.user?.role || 'admin',
          action: 'STUDENT_GRADUATED',
          targetType: 'Student',
          targetId: student._id.toString(),
          departmentId: dept._id.toString(),
          metadata: { description: `Marked student ${student.name} as graduated after completing Semester ${student.currentSemester} for Department: ${dept.name}` }
        });
        continue;
      }

      const newCourses = nextSemCourses.map(c => ({
        courseCode: c.code || c.courseCode,
        courseTitle: c.title || c.courseTitle,
        creditHours: c.creditHours,
        grade: 'IP',
        status: 'enrolled',
        enrollmentStatus: 'enrolled',
        semester: nextSem
      }));

      student.courses = student.courses.concat(newCourses);
      student.currentSemester = nextSem;
      await student.save();
      promotedCount.push(student.rollNumber);

      await logAudit({
        actorId: req.user?._id || new mongoose.Types.ObjectId(),
        actorRole: req.user?.role || 'admin',
        action: 'BATCH_PROMOTED',
        targetType: 'Student',
        targetId: student._id.toString(),
        departmentId: dept._id.toString(),
        metadata: { description: `Promoted student ${student.name} to Semester ${nextSem} for Department: ${dept.name}` }
      });
    }

    res.status(200).json({
      status: 'success',
      message: skippedCount.length > 0
        ? `Promoted ${promotedCount.length} student(s). Graduated ${graduatedCount.length} student(s). Skipped ${skippedCount.length} student(s) with unresolved courses — sync their grades first.`
        : `Promoted ${promotedCount.length} student(s) successfully. Graduated ${graduatedCount.length} student(s).`,
      promotedCount: promotedCount.length,
      graduatedCount: graduatedCount.length,
      skippedCount: skippedCount.length,
      skipped: skippedCount,
    });
  } catch (err) {
    next(err);
  }
};

// GET: retrieve degree progress of student (FR-3)
export const getStudentDegreeProgress = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found.'
      });
    }

    let progress = await DegreeProgress.findOne({ studentId });
    if (!progress) {
      // Create dynamically if not exists
      const completedCredits = (student.courses || [])
        .filter(c => c.enrollmentStatus === 'completed' || c.status === 'completed')
        .reduce((sum, c) => sum + (c.creditHours || 0), 0);
      const totalRequired = 130;
      const remainingCredits = Math.max(totalRequired - completedCredits, 0);
      const completionPercentage = parseFloat(((completedCredits / totalRequired) * 100).toFixed(2));

      progress = await DegreeProgress.create({
        studentId,
        completedCredits,
        remainingCredits,
        completionPercentage
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        progress
      }
    });
  } catch (err) {
    next(err);
  }
};