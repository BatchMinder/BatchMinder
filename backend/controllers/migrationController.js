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

    // scopeToUserDepartments() returns { batchId: { $in: [...] } } for
    // advisors, but unlike ApprovalRequest/AuditLog/Notification, Migration
    // has no batchId field of its own — a migrating student's batch only
    // exists via studentId -> Student.batchId. Spreading that scope straight
    // into Migration.find() would query a field that doesn't exist and
    // silently return zero records for every advisor. Resolve it into a
    // studentId filter instead so advisors actually see migration cases for
    // students in their assigned batch(es) (Design Doc: advisors can review
    // migration outcomes read-only).
    let migrationQuery = scope;
    if (scope.batchId) {
      const studentsInScope = await Student.find({ batchId: scope.batchId }).select('_id');
      migrationQuery = { studentId: { $in: studentsInScope.map(s => s._id) } };
    }

    const migrations = await Migration.find(migrationQuery)
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

        // Track Credit Loss — this must be written BEFORE recalculateProgress()
        // runs, since progress recalculation reads DegreeProgress.creditLoss.
        // Previously this $inc happened AFTER recalculateProgress(), so the
        // freshly-approved migration's credit loss wasn't reflected until a
        // second, unrelated recalculation happened to run later.
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

        // Trigger recalculation engine (now sees the up-to-date credit loss)
        await recalculateProgress(student._id);

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

    // FIX: Cloudinary `resource_type: 'raw'` uploads were previously saved
    // without a file extension baked into the URL/public_id (e.g.
    // ".../migration-decision-sheets/abc123" instead of "...abc123.pdf").
    // Browsers then download the file with no extension at all, so the OS
    // has no idea what app to open it with. Passing `format` explicitly
    // tells Cloudinary to append the real extension to the stored resource,
    // so the resulting secure_url — and therefore every download link built
    // from it — ends in .pdf / .jpg / .png as expected.
    const ext = (path.extname(req.file.originalname) || '.pdf').replace('.', '').toLowerCase();
    const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'auto';
    const cloudResult = await uploadToCloudinary(req.file.buffer, folder, {
      resource_type: resourceType,
      format: ext,
    });

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

// Fetches a migration document (Cloudinary URL or legacy local path) as raw bytes.
const fetchMigrationDocBuffer = async (docUrl) => {
  if (docUrl.startsWith('http://') || docUrl.startsWith('https://')) {
    const response = await fetch(docUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file. Status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
  const filePath = path.join(__dirname, '..', docUrl);
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found on disk.');
  }
  return new Uint8Array(fs.readFileSync(filePath));
};

// Best-effort guess at a Content-Type for the streamed-back file, based on
// the saved original filename's extension. Falls back to a generic binary
// type (still triggers a normal "Save As" download in every browser) when
// the extension is missing or unrecognized.
const guessContentType = (filename) => {
  const ext = path.extname(filename || '').toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    default: return 'application/octet-stream';
  }
};

// Streams a migration document (transcript or decision sheet) back through
// our own backend instead of redirecting to the raw Cloudinary URL. This is
// what actually fixes "downloads with a garbled filename":
//   1. The HTML `download="..."` attribute on an <a> tag is silently ignored
//      by browsers when the link's origin differs from the page's origin —
//      Cloudinary URLs are cross-origin, so the browser falls back to
//      whatever text is at the end of the URL (the Cloudinary public_id).
//   2. Any file uploaded before the `format: ext` fix in
//      handleMigrationDocumentUpload has no extension in its Cloudinary URL
//      at all, so even a right-click "Save As" has nothing to go on.
// Routing the download through this same-origin endpoint sidesteps both
// problems: the Content-Disposition header below is always honored,
// regardless of what the underlying storage URL looks like.
const downloadMigrationDocument = async (req, res, { urlField, nameField, fallbackName }) => {
  try {
    const { id } = req.params;
    const scope = scopeToUserDepartments(req);

    const migration = await Migration.findOne({ _id: id, ...scope });
    if (!migration) {
      return res.status(404).json({ message: 'Migration record not found' });
    }

    const docUrl = migration[urlField];
    if (!docUrl) {
      return res.status(404).json({ message: 'No file on record for this migration.' });
    }

    const buffer = await fetchMigrationDocBuffer(docUrl);
    const filename = (migration[nameField] || fallbackName).replace(/["\r\n]/g, '');

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', guessContentType(filename));
    res.setHeader('Content-Length', buffer.length);
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ message: 'Failed to download file: ' + error.message });
  }
};

export const downloadTranscript = (req, res) =>
  downloadMigrationDocument(req, res, {
    urlField: 'transcriptUrl',
    nameField: 'transcriptOriginalName',
    fallbackName: 'transcript.pdf',
  });

export const downloadDecisionSheet = (req, res) =>
  downloadMigrationDocument(req, res, {
    urlField: 'decisionSheetUrl',
    nameField: 'decisionSheetOriginalName',
    fallbackName: 'decision-sheet.pdf',
  });

// Extracts line-reconstructed text from a PDF buffer using pdfjs-dist,
// grouping text items by y-position (line) then ordering by x-position
// (left to right) so columns in tabular PDFs read in the right order.
const extractPdfLines = async (pdfBuffer) => {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  const textParts = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items.filter(it => it.str && it.str.trim());
    if (items.length > 0) {
      const lineMap = new Map();
      items.forEach(it => {
        const y = Math.round(it.transform[5]);
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y).push({ x: it.transform[4], str: it.str });
      });
      const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
      sortedYs.forEach(y => {
        const lineItems = lineMap.get(y).sort((a, b) => a.x - b.x);
        textParts.push(lineItems.map(it => it.str).join(' '));
      });
    }
  }
  return textParts.join('\n');
};

// Parses a transcript PDF's text into a courseCode -> { credits, grade,
// semester } lookup. Transcript rows look like:
// "CSC-101 Programming Fundamentals 3 A" (CODE TITLE CREDITS GRADE).
// The transcript is the only one of the two documents that actually states
// credit hours — the decision sheet only carries type/verdict/reason — so
// this is how accepted courses get their real credit-hour count instead of
// a guess.
const parseTranscriptCreditLookup = (rawText) => {
  const lookup = new Map();
  let currentSemester = 1;
  for (const raw of rawText.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const semMatch = line.match(/^Semester\s+(\d)/i);
    if (semMatch) {
      currentSemester = parseInt(semMatch[1]);
      continue;
    }
    const m = line.match(/^([A-Z]{2,4}-\d{3}[A-Z]?)\s+.+?\s+(\d+)\s+([A-F][+-]?|IP|W)\s*$/i);
    if (m) {
      lookup.set(m[1].toUpperCase(), {
        credits: parseInt(m[2]),
        grade: m[3].toUpperCase(),
        semester: currentSemester,
      });
    }
  }
  return lookup;
};

export const parseDecisionSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const scope = scopeToUserDepartments(req);

    const migration = await Migration.findOne({ _id: id, ...scope });
    if (!migration) {
      return res.status(404).json({ message: 'Migration record not found' });
    }
    if (!migration.decisionSheetUrl) {
      return res.status(400).json({ message: 'No decision sheet uploaded for this migration. Please upload the decision sheet first.' });
    }

    let pdfBuffer;
    try {
      pdfBuffer = await fetchMigrationDocBuffer(migration.decisionSheetUrl);
    } catch (fetchErr) {
      console.error(`[parseDecisionSheet] Fetch failed: ${fetchErr.message}`);
      return res.status(404).json({ message: `Failed to load decision sheet file: ${fetchErr.message}` });
    }

    let rawText = '';

    // Try pdfjs-dist first for text extraction
    try {
      rawText = await extractPdfLines(pdfBuffer);
    } catch (pdfErr) {
      console.warn('[parseDecisionSheet] pdfjs-dist extraction failed:', pdfErr.message);
    }

    // Parse extracted text into course rows. The Migration Committee's
    // decision sheet is a table of "CODE TITLE TYPE DECISION REMARK" rows
    // (e.g. "CSC-101 Programming Fundamentals CORE ACCEPT Content fully
    // matches CSC-101."), where TYPE is CORE/ELECTIVE/LAB/GENERAL and
    // DECISION is ACCEPT/REJECT. Long remarks commonly wrap onto one or
    // more following lines with no course code of their own — those get
    // appended to the previous row's remark rather than treated as new rows.
    const courses = [];
    const seen = new Set();

    if (rawText.length > 50) {
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      let currentSemester = 1;
      let inTable = false;
      const rowPattern = /^([A-Z]{2,4}-\d{3}[A-Z]?)\s+(.+?)\s+(CORE|ELECTIVE|LAB|GENERAL)\s+(ACCEPT(?:ED)?|REJECT(?:ED)?)\b\s*(.*)$/i;
      const tableEndPattern = /^(Summary:|Credit transfer cap|Signed:)/i;

      for (const line of lines) {
        const semMatch = line.match(/^Semester\s+(\d)/i);
        if (semMatch) {
          currentSemester = parseInt(semMatch[1]);
          continue;
        }

        if (/^CODE\s+TITLE\s+TYPE\s+DECISION/i.test(line)) {
          inTable = true;
          continue;
        }
        if (tableEndPattern.test(line)) {
          inTable = false;
          continue;
        }

        const m = line.match(rowPattern);
        if (m) {
          inTable = true;
          const code = m[1].toUpperCase();
          if (seen.has(code)) continue;
          seen.add(code);
          courses.push({
            courseName: `${code} ${m[2].trim()}`,
            courseCodeOnly: code,
            courseType: m[3].toUpperCase(),
            credits: 0, // backfilled below from the transcript, curriculum mapping, or a type-based default
            grade: '',
            semester: currentSemester,
            equivalencyStatus: /^ACCEPT/i.test(m[4]) ? 'accepted' : 'rejected',
            decisionRemark: (m[5] || '').trim(),
            mappedCourseName: ''
          });
        } else if (inTable && courses.length > 0) {
          // Wrapped continuation of the previous row's remark
          courses[courses.length - 1].decisionRemark = `${courses[courses.length - 1].decisionRemark} ${line}`.trim();
        }
      }
    }

    if (courses.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'Could not extract courses from the decision sheet PDF. The PDF may contain scanned images. Please add courses manually using the form below.',
        data: { courses: [], totalExtracted: 0 }
      });
    }

    // Backfill real credit hours (and grade) per course from the transcript,
    // since the decision sheet itself doesn't carry a credit-hours column.
    if (migration.transcriptUrl) {
      try {
        const transcriptBuffer = await fetchMigrationDocBuffer(migration.transcriptUrl);
        const transcriptText = await extractPdfLines(transcriptBuffer);
        const creditLookup = parseTranscriptCreditLookup(transcriptText);
        for (const c of courses) {
          const found = creditLookup.get(c.courseCodeOnly);
          if (found) {
            c.credits = found.credits;
            c.grade = found.grade;
            c.semester = found.semester;
          }
        }
      } catch (err) {
        console.warn('[parseDecisionSheet] Transcript credit backfill failed:', err.message);
      }
    }

    // Any course still without a credit value (transcript missing, unparsable,
    // or the course wasn't found in it) falls back to a sensible default by
    // type so the record is still valid (credits is required) — the admin
    // can correct it by hand before deciding/approving.
    for (const c of courses) {
      if (!c.credits) {
        c.credits = c.courseType === 'LAB' ? 1 : 3;
      }
      delete c.courseCodeOnly;
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

            // Exact title match first: a substring-only pass (below) would
            // match "Programming Fundamentals Lab" onto "Programming
            // Fundamentals" (the lecture) before ever reaching the actual
            // "Programming Fundamentals Lab" entry, since the lecture course
            // is a substring of the lab's title and happens to sit earlier
            // in the array. An exact match — when one exists — is always the
            // correct course and must win over any substring match.
            let matchedCourse = allTargetCourses.find(tc => tc.title.toLowerCase() === cleanSourceTitle);

            if (!matchedCourse) {
              matchedCourse = allTargetCourses.find(tc => {
                const targetTitle = tc.title.toLowerCase();
                return cleanSourceTitle.includes(targetTitle) || targetTitle.includes(cleanSourceTitle);
              });
            }

            if (matchedCourse) {
              c.mappedCourseName = matchedCourse.code;
              c.credits = matchedCourse.creditHours; // Auto-update credits to match the curriculum
              c.courseType = matchedCourse.courseType || c.courseType || 'CORE'; // Carry over ELECTIVE/LAB/GENERAL so downstream elective-alignment checks actually see it
            }
          }
        }
      }
    } catch (err) {
      console.error('[parseDecisionSheet] Auto-mapping failed:', err);
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
    console.error('[parseDecisionSheet] Error:', error.message);
    res.status(500).json({ message: 'Failed to parse decision sheet: ' + error.message });
  }
};