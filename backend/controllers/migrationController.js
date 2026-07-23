import Migration from '../models/migration.js';
import Student from '../models/student.js';
import Curriculum from '../models/curriculum.js';
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
    if (studentForValidation?.batchId) {
      const targetCurriculum = await Curriculum.findOne({ batchId: studentForValidation.batchId });
      if (targetCurriculum?.courses) {
        curriculumCourseCodes = new Set(targetCurriculum.courses.map(c => c.code));
      }
    }

    for (const decision of courseDecisions) {
      const { courseName, equivalencyStatus } = decision;
      if (!['accepted', 'rejected'].includes(equivalencyStatus)) {
        return res.status(400).json({ message: `Invalid status for ${courseName}: must be accepted or rejected` });
      }

      const course = migration.transferredCourses.find(
        c => c.courseName === courseName
      );
      if (!course) {
        return res.status(400).json({ message: `Course ${courseName} not found in migration record` });
      }

      if (equivalencyStatus === 'rejected' && !remarks) {
        return res.status(400).json({ message: 'Remarks are required when rejecting courses' });
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
    }

    migration.decidedBy = req.user._id;
    migration.decidedAt = new Date();
    if (remarks) migration.remarks = remarks;

    // Use the explicit status provided by the frontend, defaulting to approved if valid
    const targetStatus = (status === 'rejected' || status === 'returned') ? status : 'approved';

    // Strict Rule: Cannot approve a migration request without an uploaded transcript
    if (targetStatus === 'approved' && !migration.transcriptUrl) {
      return res.status(400).json({
        status: 'fail',
        message: 'Migration request cannot be approved without an uploaded HEC-Verified Transcript.'
      });
    }

    migration.status = targetStatus;

    const acceptedCredits = migration.transferredCourses
      .filter(c => c.equivalencyStatus === 'accepted')
      .reduce((sum, c) => sum + c.credits, 0);

    if (migration.curriculumComparison) {
      migration.curriculumComparison.toCompletedCredits = acceptedCredits;
      migration.curriculumComparison.toRemainingCredits = Math.max(0, (migration.curriculumComparison.toRequiredCredits || 120) - acceptedCredits);
    }

    await migration.save();

    // Only update student if migration is approved
    let student = null;
    let oldCgpaStatus = null;

    if (targetStatus === 'approved') {
      student = await Student.findById(migration.studentId);
      if (student) {
        oldCgpaStatus = student.cgpaStatus;

        // Fetch target curriculums to resolve course titles
        const mongoose = (await import('mongoose')).default;
        const Curriculum = mongoose.model('Curriculum');
        let allTargetCourses = [];
        if (student.batchId) {
          const deptCurr = await Curriculum.findOne({ batchId: student.batchId });
          if (deptCurr && deptCurr.courses) allTargetCourses = [...allTargetCourses, ...deptCurr.courses];
        }

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

        // Assign target semester (use provided targetSemester or keep current semester)
        const assignedSemester = targetSemester || student.currentSemester || 1;
        student.currentSemester = assignedSemester;

        // Auto-enroll migrated student in HEC curriculum courses for their assigned semester
        const batchCurriculum = await Curriculum.findOne({ batchId: student.batchId });

        if (batchCurriculum) {
          student.curriculumID = batchCurriculum._id;
        }

        if (batchCurriculum && batchCurriculum.courses) {
          const semesterCourses = batchCurriculum.courses.filter(c => c.semester === assignedSemester);
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

        // Calculate True CGPA using STMU GPA formula: Sum(Points * CH) / Sum(CH)
        student.cgpa = calculateSTMU_CGPA(student.courses);

        // Convert temporary MIG- placeholder roll number to a real, permanent
        // batch roll number now that migration is approved and the student is
        // a fully enrolled batch member. Previously the MIG- id was never
        // replaced, so approved migrated students stayed as "MIG-482913"
        // forever even after joining a real batch.
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
      }
    }

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
        description: `Decided on migration for student ${student ? student.name : migration.studentId}`,
        acceptedCount: courseDecisions.filter(d => d.equivalencyStatus === 'accepted').length,
        rejectedCount: courseDecisions.filter(d => d.equivalencyStatus === 'rejected').length,
      },
    });

    // 2. Generate Migration Decision Notification
    await logNotification({
      type: 'info',
      message: `Migration request decided for student ${student ? student.name : 'Unknown'} (${student ? student.rollNumber : ''}).`,
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

export const uploadTranscript = async (req, res) => {
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

    // Delete existing transcript from Cloudinary if previously uploaded
    if (migration.transcriptCloudinaryId) {
      try {
        await deleteFromCloudinary(migration.transcriptCloudinaryId);
      } catch (delErr) {
        console.warn('[uploadTranscript] Failed to delete previous Cloudinary file:', delErr.message);
      }
    }

    // Upload to Cloudinary
    const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'auto';
    const cloudResult = await uploadToCloudinary(req.file.buffer, 'transcripts', { resource_type: resourceType });

    const transcriptUrl = cloudResult.secure_url || cloudResult.url;
    migration.transcriptUrl = transcriptUrl;
    migration.transcriptCloudinaryId = cloudResult.public_id || '';
    migration.transcriptOriginalName = req.file.originalname;
    await migration.save();

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'MIGRATION_TRANSCRIPT_UPLOADED',
      targetType: 'Migration',
      targetId: migration._id.toString(),
      departmentId: migration.departmentId.toString(),
      metadata: { description: `Transcript uploaded to Cloudinary: ${req.file.originalname}` },
    });

    res.status(200).json({
      status: 'success',
      data: {
        transcriptUrl,
        transcriptOriginalName: req.file.originalname,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
        const mongoose = (await import('mongoose')).default;
        const Curriculum = mongoose.model('Curriculum');
        let allTargetCourses = [];

        // Get department curriculum
        if (student.batchId) {
          const deptCurr = await Curriculum.findOne({ batchId: student.batchId });
          if (deptCurr && deptCurr.courses) {
            allTargetCourses = [...allTargetCourses, ...deptCurr.courses];
          }
        }

        // Get batch curriculum as fallback
        const batchCurr = await Curriculum.findOne({ batchId: student.batchId });
        if (batchCurr && batchCurr.courses) {
          allTargetCourses = [...allTargetCourses, ...batchCurr.courses];
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