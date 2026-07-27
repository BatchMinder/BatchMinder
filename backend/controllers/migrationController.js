import Migration from '../models/migration.js';
import Student from '../models/student.js';
import Curriculum from '../models/curriculum.js';
import { resolveCurriculumForStudent } from '../utils/curriculumResolver.js';
import Batch from '../models/batch.js';
import { scopeToUserDepartments } from '../middleware/scopeMiddleware.js';
import { logAudit, logNotification } from '../utils/logger.js';
import { recalculateProgress } from '../services/progressRecalculationService.js';
import { STMU_GRADE_MAP, calculateSTMU_CGPA, calculateMigratedStudentSemester } from '../utils/stmuGrading.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getAllMigrations = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(200).json({ status: 'success', data: { migrations: [] } });
    }

    const migrations = await Migration.find(scope)
      .populate({
        path: 'studentId',
        select: 'name rollNumber phone email currentSemester cgpa cgpaStatus batchId courses',
        populate: {
          path: 'batchId',
          select: 'code startYear'
        }
      })
      .populate('departmentId', 'code name')
      .populate('decidedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', results: migrations.length, data: { migrations } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createMigration = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { studentId, studentName, studentEmail, studentPhone, batchId, currentSemester, departmentId, sourceInstitution, fromProgram, transferredCourses } = req.body;

    if (!departmentId || !sourceInstitution) {
      return res.status(400).json({ message: 'Please provide departmentId and sourceInstitution' });
    }

    if (scope.departmentId && scope.departmentId.$in) {
      const allowedDepts = scope.departmentId.$in.map(id => id.toString());
      if (!allowedDepts.includes(departmentId.toString())) {
        return res.status(403).json({ message: 'Department not in your scope' });
      }
    }

    let finalStudentId = studentId;

    if (!finalStudentId) {
      if (!studentName || !batchId) {
        return res.status(400).json({ message: 'Please provide either studentId or studentName and batchId' });
      }

      // Generate a deterministic, sequential temporary roll number for this
      // prospective migrating student, tied to their target batch:
      // MIG-{BatchCode}-{4-digit sequence}. Previously this was a random
      // 6-digit number (MIG-482913) with NO uniqueness check at all — two
      // migrations created close together could theoretically collide, and
      // the ID had no connection to the student's actual batch/semester.
      let tempRoll;
      {
        const targetBatch = await Batch.findById(batchId);
        const migPrefix = targetBatch ? `MIG-${targetBatch.code}-` : 'MIG-UNASSIGNED-';
        let attempt = 0;
        do {
          const count = await Student.countDocuments({ rollNumber: { $regex: `^${migPrefix}` } });
          tempRoll = `${migPrefix}${String(count + 1 + attempt).padStart(4, '0')}`;
          attempt++;
        } while (await Student.findOne({ rollNumber: tempRoll }) && attempt < 5);
      }
      const newStudent = await Student.create({
        rollNumber: tempRoll,
        name: studentName,
        email: studentEmail || `${studentName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        phone: studentPhone || '',
        departmentId,
        batchId,
        currentSemester: Number(currentSemester) || 1,
        cgpa: 0.0,
        status: 'active'
      });
      finalStudentId = newStudent._id;
    }

    const migration = await Migration.create({
      studentId: finalStudentId,
      departmentId,
      sourceInstitution,
      fromProgram: fromProgram || '',
      transferredCourses: transferredCourses || [],
    });

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'MIGRATION_CREATED',
      targetType: 'Migration',
      targetId: migration._id.toString(),
      departmentId: departmentId.toString(),
      metadata: { description: `Created migration request from ${sourceInstitution}` },
    });

    res.status(201).json({ status: 'success', data: { migration } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const decideMigration = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { courseDecisions, remarks, status, targetSemester } = req.body;

    if (!courseDecisions || !Array.isArray(courseDecisions) || courseDecisions.length === 0) {
      return res.status(400).json({ message: 'Please provide courseDecisions array' });
    }

    const migration = await Migration.findOne({ _id: id, ...scope });
    if (!migration) {
      return res.status(404).json({ message: 'Migration record not found' });
    }

    // Curriculum-alignment check for electives (Scope Doc FE-12 / Dev Blueprint §5.3):
    // electives are only accepted if they map to a real course in the target
    // curriculum — content similarity alone is not sufficient. Core/Lab/General
    // courses are not subject to this restriction.
    const studentForValidation = await Student.findById(migration.studentId);
    let curriculumCourseCodes = new Set();
    let studentCurriculum = null;
    if (studentForValidation) {
      studentCurriculum = await resolveCurriculumForStudent(studentForValidation);
      if (studentCurriculum?.courses) {
        curriculumCourseCodes = new Set(studentCurriculum.courses.map(c => c.code));
      }
    }

    for (const decision of courseDecisions) {
      const { courseName, equivalencyStatus, remark } = decision;
      if (!['accepted', 'rejected'].includes(equivalencyStatus)) {
        return res.status(400).json({ message: `Invalid status for ${courseName}: must be accepted or rejected` });
      }

      const course = migration.transferredCourses.find(
        c => c.courseName === courseName
      );
      if (!course) {
        return res.status(400).json({ message: `Course ${courseName} not found in migration record` });
      }

      // Every rejection needs its own recorded reason — this is what makes
      // the audit trail (FE-11) meaningful per-course, not just one generic
      // remark for the whole case. The Migration Committee's decision sheet
      // always has a stated reason for each rejection; the admin is just
      // transcribing it here.
      if (equivalencyStatus === 'rejected' && !(remark && remark.trim())) {
        return res.status(400).json({ message: `A reason is required for rejecting "${courseName}" (the Migration Committee's stated reason from the decision sheet).` });
      }

      if (
        equivalencyStatus === 'accepted' &&
        course.courseType === 'ELECTIVE' &&
        (!course.mappedCourseName || !curriculumCourseCodes.has(course.mappedCourseName))
      ) {
        return res.status(400).json({
          message: `Elective "${courseName}" cannot be accepted: it must be mapped to an official course offered in the target curriculum (curriculum alignment required, not content similarity). Set a valid mappedCourseName before accepting.`
        });
      }

      course.equivalencyStatus = equivalencyStatus;
      if (equivalencyStatus === 'rejected') {
        course.decisionRemark = remark.trim();
      }
    }

    // Use the explicit status provided by the frontend, defaulting to approved if valid
    const targetStatus = (status === 'rejected' || status === 'returned') ? status : 'approved';

    // Nothing can be left undecided before a migration is approved — a
    // course that nobody has explicitly accepted or rejected must never be
    // silently treated as accepted just because the overall case was
    // approved. This is the "completeness gate" from the documented
    // workflow: every course from the transcript needs a real decision.
    if (targetStatus === 'approved') {
      const unresolved = migration.transferredCourses.filter(c => c.equivalencyStatus === 'pending');
      if (unresolved.length > 0) {
        return res.status(400).json({
          message: `Cannot approve: ${unresolved.length} course(s) still have no accept/reject decision (${unresolved.map(c => c.courseName).join(', ')}). Every transferred course must be decided before approving.`
        });
      }
    }

    migration.decidedBy = req.user._id;
    migration.decidedAt = new Date();
    if (remarks) migration.remarks = remarks;

    // Strict Rule: Cannot approve a migration request without an uploaded transcript
    // AND the Migration Committee's signed decision sheet — the admin's
    // per-course decisions above should be a transcription of that sheet,
    // not something typed from memory.
    if (targetStatus === 'approved' && !migration.transcriptUrl) {
      return res.status(400).json({
        status: 'fail',
        message: 'Migration request cannot be approved without an uploaded HEC-Verified Transcript.'
      });
    }
    if (targetStatus === 'approved' && !migration.decisionSheetUrl) {
      return res.status(400).json({
        status: 'fail',
        message: 'Migration request cannot be approved without the Migration Committee\'s signed decision sheet on file.'
      });
    }

    migration.status = targetStatus;

    const acceptedCredits = migration.transferredCourses
      .filter(c => c.equivalencyStatus === 'accepted')
      .reduce((sum, c) => sum + c.credits, 0);

    // Only update student records / degree progress / roll numbers when the
    // migration is genuinely approved.
    let student = null;
    let oldCgpaStatus = null;

    if (targetStatus === 'approved') {
      student = await Student.findById(migration.studentId);
      if (student) {
        oldCgpaStatus = student.cgpaStatus;

        const deptCurriculum = studentCurriculum || await resolveCurriculumForStudent(student);
        const allTargetCourses = deptCurriculum?.courses || [];

        // Recalculate degree progress & synchronize transferred courses to student profile
        for (const c of migration.transferredCourses) {
          let targetCode = c.mappedCourseName || c.courseName;
          let targetTitle = c.mappedCourseName || c.courseName;

          const matchedCourse = allTargetCourses.find(tc => tc.code === c.mappedCourseName);
          if (matchedCourse) {
            targetCode = matchedCourse.code;
            targetTitle = matchedCourse.title;
          }

          const existingIdx = student.courses.findIndex(sc => sc.courseCode === targetCode);
          if (existingIdx !== -1) {
            if (c.equivalencyStatus === 'accepted') {
              student.courses[existingIdx].grade = c.grade || 'A';
              student.courses[existingIdx].enrollmentStatus = 'completed';
              student.courses[existingIdx].status = 'completed';
              student.courses[existingIdx].creditHours = c.credits;
            } else if (c.equivalencyStatus === 'rejected') {
              student.courses[existingIdx].grade = 'F'; // Credit Loss
              student.courses[existingIdx].enrollmentStatus = 'failed';
              student.courses[existingIdx].status = 'failed';
              student.courses[existingIdx].creditHours = c.credits;
            }
          } else {
            if (c.equivalencyStatus === 'accepted') {
              student.courses.push({
                courseCode: targetCode,
                courseTitle: targetTitle,
                creditHours: c.credits,
                grade: c.grade || 'A',
                enrollmentStatus: 'completed',
                status: 'completed',
                semester: c.semester || 1
              });
            } else if (c.equivalencyStatus === 'rejected') {
              student.courses.push({
                courseCode: targetCode,
                courseTitle: targetTitle,
                creditHours: c.credits,
                grade: 'F', // Credit Loss
                enrollmentStatus: 'failed',
                status: 'failed',
                semester: c.semester || 1
              });
            }
          }
        }

        // Assign target semester: the admin's explicit choice if given,
        // otherwise the documented credit-based placement rule
        // (calculateMigratedStudentSemester: 0-15 CH -> Sem 1, 16-32 -> Sem 2,
        // ... 117+ -> Sem 8) instead of just leaving them wherever they
        // started.
        const parsedTargetSemester = Number(targetSemester);
        const assignedSemester = (Number.isInteger(parsedTargetSemester) && parsedTargetSemester >= 1 && parsedTargetSemester <= 8)
          ? parsedTargetSemester
          : calculateMigratedStudentSemester(acceptedCredits);
        student.currentSemester = assignedSemester;

        if (deptCurriculum) {
          student.curriculumID = deptCurriculum._id;
        }

        // Auto-enroll migrated student in their assigned semester's courses
        if (deptCurriculum && deptCurriculum.courses) {
          const semesterCourses = deptCurriculum.courses.filter(c => c.semester === assignedSemester);
          for (const hecCourse of semesterCourses) {
            const existingCourse = student.courses.find(sc => sc.courseCode === hecCourse.code);
            if (!existingCourse) {
              student.courses.push({
                courseCode: hecCourse.code,
                courseTitle: hecCourse.title,
                creditHours: hecCourse.creditHours,
                grade: 'IP',
                enrollmentStatus: 'enrolled',
                status: 'enrolled',
                semester: assignedSemester
              });
            }
          }
        }

        // --- Scope Doc FE-13/FE-14/FE-37: Degree Progress Adjustment &
        // Academic Plan Realignment for Migrated Students ---
        // Find CORE courses from every curriculum semester BEFORE the
        // student's assigned semester that aren't satisfied by an
        // accepted/completed course on their record — then actually
        // schedule them into the student's future course plan (the next
        // semester after the one they're assigned to), tagged as a
        // migration backlog requirement, rather than just noting they're
        // missing. Electives/General are excluded: a missed elective isn't
        // a specific hard requirement the way a missing core course is.
        let missingCourses = [];
        if (deptCurriculum && deptCurriculum.courses) {
          const completedCodes = new Set(
            student.courses
              .filter(sc => sc.status === 'completed')
              .map(sc => sc.courseCode)
          );
          missingCourses = deptCurriculum.courses
            .filter(c => c.semester < assignedSemester && c.courseType === 'CORE')
            .filter(c => !completedCodes.has(c.code))
            .map(c => ({ courseCode: c.code, courseTitle: c.title, creditHours: c.creditHours }));

          const scheduleSemester = Math.min(assignedSemester + 1, 8);
          for (const mc of missingCourses) {
            const alreadyScheduled = student.courses.find(sc => sc.courseCode === mc.courseCode);
            if (!alreadyScheduled) {
              student.courses.push({
                courseCode: mc.courseCode,
                courseTitle: mc.courseTitle,
                creditHours: mc.creditHours,
                grade: 'IP',
                enrollmentStatus: 'enrolled',
                status: 'enrolled',
                semester: scheduleSemester,
                isMigrationBacklog: true,
              });
            }
          }
        }
        migration.missingCourses = missingCourses;

        // Calculate True CGPA using STMU GPA formula: Sum(Points * CH) / Sum(CH)
        student.cgpa = calculateSTMU_CGPA(student.courses);

        // Convert temporary MIG- placeholder roll number to a real, permanent
        // batch roll number now that migration is approved and the student is
        // a fully enrolled batch member.
        if (student.rollNumber && student.rollNumber.toUpperCase().startsWith('MIG-')) {
          const enrolledBatch = await Batch.findById(student.batchId);
          if (enrolledBatch) {
            let attempt = 0;
            let newRoll;
            do {
              const count = await Student.countDocuments({ batchId: enrolledBatch._id, rollNumber: { $not: /^MIG-/i } });
              newRoll = `${enrolledBatch.code}-${String(count + 1 + attempt).padStart(4, '0')}`;
              attempt++;
            } while (await Student.findOne({ rollNumber: newRoll }) && attempt < 5);
            student.rollNumber = newRoll;
          }
        }

        await student.save();

        // Trigger recalculation engine
        await recalculateProgress(student._id);

        // Track Credit Loss
        let creditLoss = 0;
        for (const c of migration.transferredCourses) {
          if (c.equivalencyStatus === 'rejected') {
            creditLoss += c.credits;
          }
        }
        if (creditLoss > 0) {
          const DegreeProgress = (await import('../models/degreeProgress.js')).default;
          await DegreeProgress.findOneAndUpdate(
            { studentId: student._id },
            { $inc: { creditLoss: creditLoss } },
            { upsert: true }
          );
        }

        // Curriculum comparison snapshot for the migration audit report
        // (FE-36/FE-38).
        const toRequiredCredits = deptCurriculum?.totalRequiredCredits || 130;
        const toRemainingCredits = Math.max(0, toRequiredCredits - acceptedCredits);
        const remainingSemesters = Math.max(0, 8 - assignedSemester);
        const now = new Date();
        let gradSeason = now.getMonth() >= 6 ? 'Fall' : 'Spring';
        let gradYear = now.getFullYear();
        for (let i = 0; i < remainingSemesters; i++) {
          gradSeason = gradSeason === 'Fall' ? 'Spring' : 'Fall';
          if (gradSeason === 'Spring') gradYear++;
        }
        migration.curriculumComparison = {
          ...(migration.curriculumComparison ? migration.curriculumComparison.toObject() : {}),
          toRequiredCredits,
          toCompletedCredits: acceptedCredits,
          toRemainingCredits,
          toDurationSemesters: 8,
          expectedCompletion: `${gradSeason} ${gradYear}`,
        };
      }
    } else if (migration.curriculumComparison) {
      migration.curriculumComparison.toCompletedCredits = acceptedCredits;
      migration.curriculumComparison.toRemainingCredits = Math.max(0, (migration.curriculumComparison.toRequiredCredits || 130) - acceptedCredits);
    }

    await migration.save();

    // 1. Log Audit
    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'MIGRATION_DECIDED',
      targetType: 'Migration',
      targetId: migration._id.toString(),
      departmentId: migration.departmentId.toString(),
      batchId: student ? student.batchId.toString() : undefined,
      metadata: {
        description: `Decided on migration for student ${student ? student.name : migration.studentId} (status: ${targetStatus})`,
        acceptedCount: courseDecisions.filter(d => d.equivalencyStatus === 'accepted').length,
        rejectedCount: courseDecisions.filter(d => d.equivalencyStatus === 'rejected').length,
      },
    });

    // 2. Generate Migration Decision Notification
    await logNotification({
      type: 'info',
      message: `Migration request ${targetStatus} for student ${student ? student.name : 'Unknown'} (${student ? student.rollNumber : ''}).`,
      departmentId: migration.departmentId.toString(),
      batchId: student ? student.batchId.toString() : undefined,
      deepLinkUrl: `/admin/migrations`
    });

    // 3. Generate CGPA status change notification if status changed
    if (student && oldCgpaStatus !== student.cgpaStatus) {
      await logNotification({
        type: student.cgpaStatus === 'critical' ? 'critical' : (student.cgpaStatus === 'warning' ? 'warning' : 'info'),
        message: `Student ${student.name} (${student.rollNumber}) CGPA status changed from ${oldCgpaStatus} to ${student.cgpaStatus} (CGPA: ${student.cgpa}) after migration decision.`,
        departmentId: student.departmentId.toString(),
        batchId: student.batchId.toString(),
        deepLinkUrl: `/admin/students`
      });
    }

    res.status(200).json({ status: 'success', data: { migration } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMigration = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { transferredCourses, fromProgram, toProgram, curriculumComparison } = req.body;

    const migration = await Migration.findOne({ _id: id, ...scope });
    if (!migration) {
      return res.status(404).json({ message: 'Migration record not found' });
    }

    if (transferredCourses !== undefined) migration.transferredCourses = transferredCourses;
    if (fromProgram !== undefined) migration.fromProgram = fromProgram;
    if (toProgram !== undefined) migration.toProgram = toProgram;
    if (curriculumComparison !== undefined) migration.curriculumComparison = curriculumComparison;

    await migration.save();

    res.status(200).json({ status: 'success', data: { migration } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Shared upload logic for either of the two migration documents: the
// transcript (student's raw course history) or the decision sheet (the
// Migration Committee's signed verdict, which the admin actually transcribes
// course decisions from).
const handleMigrationDocumentUpload = async (req, res, { urlField, idField, nameField, folder, auditAction, auditLabel }) => {
  try {
    const { id } = req.params;
    const scope = scopeToUserDepartments(req);

    const migration = await Migration.findOne({ _id: id, ...scope });
    if (!migration) {
      return res.status(404).json({ message: 'Migration record not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please attach a PDF or image.' });
    }

    // Delete existing file from Cloudinary if previously uploaded
    if (migration[idField]) {
      try {
        await deleteFromCloudinary(migration[idField]);
      } catch (delErr) {
        console.warn(`[${auditAction}] Failed to delete previous Cloudinary file:`, delErr.message);
      }
    }

    const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'auto';
    const cloudResult = await uploadToCloudinary(req.file.buffer, folder, { resource_type: resourceType });

    const fileUrl = cloudResult.secure_url || cloudResult.url;
    migration[urlField] = fileUrl;
    migration[idField] = cloudResult.public_id || '';
    migration[nameField] = req.file.originalname;
    await migration.save();

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: auditAction,
      targetType: 'Migration',
      targetId: migration._id.toString(),
      departmentId: migration.departmentId.toString(),
      metadata: { description: `${auditLabel} uploaded to Cloudinary: ${req.file.originalname}` },
    });

    res.status(200).json({
      status: 'success',
      data: {
        [urlField]: fileUrl,
        [nameField]: req.file.originalname,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadTranscript = async (req, res) => {
  return handleMigrationDocumentUpload(req, res, {
    urlField: 'transcriptUrl',
    idField: 'transcriptCloudinaryId',
    nameField: 'transcriptOriginalName',
    folder: 'transcripts',
    auditAction: 'MIGRATION_TRANSCRIPT_UPLOADED',
    auditLabel: 'Transcript',
  });
};

export const uploadDecisionSheet = async (req, res) => {
  return handleMigrationDocumentUpload(req, res, {
    urlField: 'decisionSheetUrl',
    idField: 'decisionSheetCloudinaryId',
    nameField: 'decisionSheetOriginalName',
    folder: 'migration-decision-sheets',
    auditAction: 'MIGRATION_DECISION_SHEET_UPLOADED',
    auditLabel: "Migration Committee decision sheet",
  });
};


export const parseTranscript = async (req, res) => {
  try {
    const { id } = req.params;
    const scope = scopeToUserDepartments(req);

    const migration = await Migration.findOne({ _id: id, ...scope });
    if (!migration) {
      return res.status(404).json({ message: 'Migration record not found' });
    }
    if (!migration.transcriptUrl) {
      return res.status(400).json({ message: 'No transcript uploaded for this migration. Please upload the transcript first.' });
    }

    let pdfBuffer;
    if (migration.transcriptUrl.startsWith('http://') || migration.transcriptUrl.startsWith('https://')) {
      try {
        console.log(`[parseTranscript] Attempting to fetch from: ${migration.transcriptUrl}`);
        const response = await fetch(migration.transcriptUrl);
        if (!response.ok) {
          console.error(`[parseTranscript] Fetch failed: ${response.status} ${response.statusText}`);
          return res.status(404).json({ message: `Failed to download transcript file from Cloudinary. Status: ${response.status}` });
        }
        const arrayBuffer = await response.arrayBuffer();
        pdfBuffer = new Uint8Array(arrayBuffer);
      } catch (fetchErr) {
        console.error(`[parseTranscript] Fetch exception: ${fetchErr.message}`);
        return res.status(500).json({ message: `Error fetching transcript from Cloudinary: ${fetchErr.message}` });
      }
    } else {
      const filePath = path.join(__dirname, '..', migration.transcriptUrl);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Transcript file not found on disk.' });
      }
      pdfBuffer = new Uint8Array(fs.readFileSync(filePath));
    }

    let rawText = '';

    // Try pdfjs-dist first for text extraction
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const doc = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
      const textParts = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        // Reconstruct lines from text items using their y-position
        const items = textContent.items.filter(it => it.str && it.str.trim());
        if (items.length > 0) {
          // Group by y coordinate (approximate line grouping)
          const lineMap = new Map();
          items.forEach(it => {
            const y = Math.round(it.transform[5]); // y-coordinate
            if (!lineMap.has(y)) lineMap.set(y, []);
            lineMap.get(y).push({ x: it.transform[4], str: it.str });
          });
          // Sort lines by y descending (top to bottom), items by x ascending (left to right)
          const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
          sortedYs.forEach(y => {
            const lineItems = lineMap.get(y).sort((a, b) => a.x - b.x);
            textParts.push(lineItems.map(it => it.str).join(' '));
          });
        }
      }
      rawText = textParts.join('\n');
    } catch (pdfErr) {
      console.warn('[parseTranscript] pdfjs-dist extraction failed:', pdfErr.message);
    }

    // Parse extracted text into course rows
    const courses = [];
    const seen = new Set();

    if (rawText.length > 50) {
      const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 3);
      let currentSemester = 1;
      for (const line of lines) {
        // Detect semester header from PDF (e.g. "Semester 1", "Semester 2")
        const semMatch = line.match(/Semester\s+(\d)/i);
        if (semMatch) {
          currentSemester = parseInt(semMatch[1]);
        }

        // Pattern: CODE TITLE CREDITS GRADE [GRADEPOINTS] [REMARKS]
        const p = line.match(/([A-Z]{2,4}-\d{3}[A-Z]?)\s+(.+?)\s+(\d)\s+([A-F][+-]?|IP)/);
        if (p) {
          const key = p[1];
          if (!seen.has(key)) {
            seen.add(key);
            courses.push({
              courseName: `${p[1]} ${p[2].replace(/\s+\d\s+[A-F][+-]?.*$/, '').trim()}`,
              credits: parseInt(p[3]),
              grade: p[4],
              semester: currentSemester,
              equivalencyStatus: 'pending',
              mappedCourseName: ''
            });
          }
        }
      }
    }



    if (courses.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'Could not extract courses from the transcript PDF. The PDF may contain scanned images. Please add courses manually using the form below.',
        data: { courses: [], totalExtracted: 0 }
      });
    }

    // Auto-map courses using curriculum data
    try {
      const student = await Student.findById(migration.studentId);
      if (student) {
        let allTargetCourses = [];

        // Get this student's pinned curriculum
        if (student.departmentId) {
          const deptCurr = await resolveCurriculumForStudent(student);
          if (deptCurr && deptCurr.courses) {
            allTargetCourses = [...allTargetCourses, ...deptCurr.courses];
          }
        }

        if (allTargetCourses.length > 0) {
          for (let c of courses) {
            // Remove typical course codes (e.g. CS-101) to get clean title
            const cleanSourceTitle = c.courseName.replace(/^[A-Z]{2,4}-\d{3}[A-Z]?\s+/, '').trim().toLowerCase();

            for (const tc of allTargetCourses) {
              const targetTitle = tc.title.toLowerCase();
              // Check for strong title overlap
              if (cleanSourceTitle.includes(targetTitle) || targetTitle.includes(cleanSourceTitle)) {
                c.mappedCourseName = tc.code;
                c.credits = tc.creditHours; // Auto-update credits to match the curriculum
                c.courseType = tc.courseType || 'CORE'; // Carry over ELECTIVE/LAB/GENERAL so downstream elective-alignment checks actually see it
                break;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[parseTranscript] Auto-mapping failed:', err);
    }

    res.status(200).json({
      status: 'success',
      data: {
        courses,
        totalExtracted: courses.length,
        source: rawText.length > 50 ? 'pdf_text' : 'institution_template'
      }
    });
  } catch (error) {
    console.error('[parseTranscript] Error:', error.message);
    res.status(500).json({ message: 'Failed to parse transcript: ' + error.message });
  }
};