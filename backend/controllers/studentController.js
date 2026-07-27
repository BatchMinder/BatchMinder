import mongoose from 'mongoose';
import Student from '../models/student.js';
import Batch from '../models/batch.js';
import Department from '../models/department.js';
import DegreeProgress from '../models/degreeProgress.js';
import { scopeToUserDepartments } from '../middleware/scopeMiddleware.js';
import { resolveCurriculumForStudent, resolveCurriculumForBatch } from '../utils/curriculumResolver.js';
import { logAudit, logNotification } from '../utils/logger.js';
import { calculateSTMU_CGPA, STMU_GRADE_MAP } from '../utils/stmuGrading.js';

// Given a target CGPA and a list of {creditHours} courses to backfill,
// assigns each course a real letter grade such that the resulting weighted
// average lands as close as possible — usually exactly, to two decimal
// places — on the target CGPA, instead of stamping one flat grade on every
// course (which can only ever reproduce that one grade's own point value).
// Works by bracketing the target between the nearest grade above and below
// it, then greedily choosing per-course whichever of the two keeps the
// running weighted average closest to the target as we go.
const assignGradesForTargetCgpa = (targetCgpa, courseCreditHoursList) => {
  const gradeEntries = Object.entries(STMU_GRADE_MAP).filter(([g]) => g !== 'F');
  let gradeAbove = null;
  let gradeBelow = null;
  for (const [grade, { points }] of gradeEntries) {
    if (points >= targetCgpa && (!gradeAbove || points < STMU_GRADE_MAP[gradeAbove].points)) gradeAbove = grade;
    if (points <= targetCgpa && (!gradeBelow || points > STMU_GRADE_MAP[gradeBelow].points)) gradeBelow = grade;
  }
  if (!gradeAbove) gradeAbove = gradeBelow;
  if (!gradeBelow) gradeBelow = gradeAbove;

  let runningPoints = 0;
  let runningCredits = 0;
  return courseCreditHoursList.map((creditHours) => {
    const cr = creditHours || 3;
    const withAbove = (runningPoints + STMU_GRADE_MAP[gradeAbove].points * cr) / (runningCredits + cr);
    const withBelow = (runningPoints + STMU_GRADE_MAP[gradeBelow].points * cr) / (runningCredits + cr);
    const chosenGrade = Math.abs(withAbove - targetCgpa) <= Math.abs(withBelow - targetCgpa) ? gradeAbove : gradeBelow;
    runningPoints += STMU_GRADE_MAP[chosenGrade].points * cr;
    runningCredits += cr;
    return chosenGrade;
  });
};

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

  // Resolve via the student's batch — respects whatever version that batch
  // is pinned to, not just whatever's currently active for the department.
  const curriculum = await resolveCurriculumForStudent(student);

  if (!curriculum || !curriculum.courses || curriculum.courses.length === 0) {
    return student;
  }

  const targetSem = student.currentSemester || 1;
  const pastCourses = curriculum.courses.filter(c => c.semester < targetSem);
  const backfillGrades = assignGradesForTargetCgpa(student.cgpa, pastCourses.map(c => c.creditHours || 3));
  let backfillIdx = 0;
  const enrolledCourses = [];

  curriculum.courses.forEach(c => {
    if (c.semester <= targetSem) {
      const isPast = c.semester < targetSem;
      enrolledCourses.push({
        courseCode: c.code,
        courseTitle: c.title,
        creditHours: c.creditHours || 3,
        grade: isPast ? backfillGrades[backfillIdx++] : 'IP',
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

// NOTE: bulk CSV/Excel student import used to live here as
// bulkUploadStudents(), but it was never wired up in the frontend and
// duplicated the real upload flow (POST /api/uploads +
// /api/uploads/:id/import in uploadController.js, called from
// DataIngestionHub.jsx). Removed to avoid two upload implementations
// drifting apart. Grade-backfilling helpers above (assignGradesForTargetCgpa,
// generateRollNumber, autoEnrollHECCourses) are still used by
// createStudent/getAllStudents/getStudentById below and were kept.



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

    // Same as syncLmsRecords: resolve via this batch's pinned version.
    const curriculumDoc = await resolveCurriculumForBatch(batchDoc);

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