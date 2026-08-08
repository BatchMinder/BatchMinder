import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './utils/db.js';
import User from './models/user.js';
import Department from './models/department.js';
import Batch from './models/batch.js';
import Student from './models/student.js';
import Curriculum from './models/curriculum.js';
import Migration from './models/migration.js';
import ApprovalRequest from './models/approvalRequest.js';
import Notification from './models/notification.js';
import { seedHECCurriculums } from './seedHECCurriculum.js';
import { calculateSTMU_CGPA } from './utils/stmuGrading.js';

dotenv.config();

async function seed() {
  try {
    await connectDB();
    console.log('Connected. Clearing collections...');

    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Batch.deleteMany({}),
      Student.deleteMany({}),
      Migration.deleteMany({}),
      ApprovalRequest.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    // Remove old curriculum indexes that reference old schema field names
    const currCol = mongoose.connection.collection('curriculums');
    const oldIndexes = await currCol.indexes();
    for (const idx of oldIndexes) {
      if (idx.key.department || idx.key.semester) {
        await currCol.dropIndex(idx.name);
        console.log(`  Dropped old index: ${idx.name}`);
      }
    }
    await Curriculum.deleteMany({});

    // ── Departments ──
    const depts = await Department.insertMany([
      { code: 'CS', name: 'Computer Science', established: 2018, status: 'Active', color: '#3B82F6' },
      { code: 'AI', name: 'Artificial Intelligence', established: 2021, status: 'Active', color: '#10B981' },
      { code: 'SE', name: 'Software Engineering', established: 2019, status: 'Active', color: '#7C3AED' },
      { code: 'CY', name: 'Cyber Security', established: 2022, status: 'Active', color: '#EF4444' },
    ]);
    const [cs, ai, se, cy] = depts.map(d => d._id);
    console.log(`  ${depts.length} departments`);

    // ── Users ──
    const users = await User.create([
      { name: 'Dean User', email: 'dean@stmu.edu.pk', password: 'password123', role: 'dean', status: 'Active' },
      { name: 'Admin CY ', email: 'admin.cy@stmu.edu.pk', password: 'password123', role: 'academic_admin', departmentIds: [cy], dept: 'Cyber Security', status: 'Active' },
      { name: 'Admin CS ', email: 'admin.cs@stmu.edu.pk', password: 'password123', role: 'academic_admin', departmentIds: [cs], dept: 'Computer Science', status: 'Active' },
      { name: 'Admin SE ', email: 'admin.se@stmu.edu.pk', password: 'password123', role: 'academic_admin', departmentIds: [se], dept: 'Software Engineering', status: 'Active' },
      { name: 'Admin AI ', email: 'admin.ai@stmu.edu.pk', password: 'password123', role: 'academic_admin', departmentIds: [ai], dept: 'Artifical Intelligence', status: 'Active' },
      { name: 'Admin All ', email: 'admin.all@stmu.edu.pk', password: 'password123', role: 'academic_admin', departmentIds: [se, cs, ai, cy], dept: 'All Departments', status: 'Active' },
      { name: 'HOD Computer Science', email: 'hod.cs@stmu.edu.pk', password: 'password123', role: 'admin', departmentIds: [cs], dept: 'Computer Science', status: 'Active' },
      { name: 'HOD Artificial Intelligence', email: 'hod.ai@stmu.edu.pk', password: 'password123', role: 'admin', departmentIds: [ai], dept: 'Artificial Intelligence', status: 'Active' },
      { name: 'HOD Software Engineering', email: 'hod.se@stmu.edu.pk', password: 'password123', role: 'admin', departmentIds: [se], dept: 'Software Engineering', status: 'Active' },
      { name: 'HOD Cyber Security', email: 'hod.cy@stmu.edu.pk', password: 'password123', role: 'admin', departmentIds: [cy], dept: 'Cyber Security', status: 'Active' },
      { name: 'Advisor Ahmed', email: 'advisor.ai@stmu.edu.pk', password: 'password123', role: 'advisor', dept: 'Artifical Intelligence', status: 'Active' },
      { name: 'Advisor Ali', email: 'advisor.cy@stmu.edu.pk', password: 'password123', role: 'advisor', dept: 'Cyber Security', status: 'Active' },
      { name: 'Advisor Fatima', email: 'advisor.cs@stmu.edu.pk', password: 'password123', role: 'advisor', dept: 'Computer Science', status: 'Active' },
      { name: 'Advisor Usman', email: 'advisor.se@stmu.edu.pk', password: 'password123', role: 'advisor', dept: 'Software Engineering', status: 'Active' },
    ]);
    console.log(`  ${users.length} users`);

    // Update HOD references on departments
    const hodCS = users.find(u => u.email === 'hod.cs@stmu.edu.pk');
    const hodAI = users.find(u => u.email === 'hod.ai@stmu.edu.pk');
    const hodSE = users.find(u => u.email === 'hod.se@stmu.edu.pk');
    const hodCY = users.find(u => u.email === 'hod.cy@stmu.edu.pk');
    await Department.updateOne({ _id: cs }, { hodId: hodCS._id });
    await Department.updateOne({ _id: ai }, { hodId: hodAI._id });
    await Department.updateOne({ _id: se }, { hodId: hodSE._id });
    await Department.updateOne({ _id: cy }, { hodId: hodCY._id });

    // ── Batches ──
    const batches = await Batch.insertMany([
      { code: 'BSCS-2022', departmentId: cs, startYear: 2022, intakeSession: 'Fall', advisor: 'Advisor Ahmed', status: 'Allocated' },
      { code: 'BSCS-2023', departmentId: cs, startYear: 2023, intakeSession: 'Fall', advisor: 'Advisor Fatima', status: 'Allocated' },
      { code: 'BSCS-2024', departmentId: cs, startYear: 2024, intakeSession: 'Fall', advisor: 'Unassigned', status: 'Unassigned' },
      { code: 'BSAI-2023', departmentId: ai, startYear: 2023, intakeSession: 'Fall', advisor: 'Unassigned', status: 'Unassigned' },
      { code: 'BSSE-2022', departmentId: se, startYear: 2022, intakeSession: 'Fall', advisor: 'Advisor Usman', status: 'Allocated' },
      { code: 'BSSE-2023', departmentId: se, startYear: 2023, intakeSession: 'Spring', advisor: 'Unassigned', status: 'Unassigned' },
      { code: 'BSCY-2023', departmentId: cy, startYear: 2023, intakeSession: 'Fall', advisor: 'Unassigned', status: 'Unassigned' },
    ]);
    const [bscs22, bscs23, bscs24, bsai23, bsse22, bsse23, bscy23] = batches.map(b => b._id);
    console.log(`  ${batches.length} batches`);

    // Assign batches to advisors
    const advisorAhmed = users.find(u => u.email === 'advisor.ai@stmu.edu.pk');
    const advisorFatima = users.find(u => u.email === 'advisor.cs@stmu.edu.pk');
    const advisorUsman = users.find(u => u.email === 'advisor.se@stmu.edu.pk');

    advisorAhmed.assignedBatchIds = [bscs22, bscs23];
    await advisorAhmed.save();

    // BSCS-2024 is intentionally included here (not just bscs23): it's the
    // department's newest/incoming-cohort batch, and migration requests are
    // targeted at it (e.g. the "Ali Hassan transfers into BSCS-24" scenario).
    // Without an advisor assigned to this batch, there is nobody who can log
    // in as "Ali's Batch Advisor" to review the migration outcome read-only.
    advisorFatima.assignedBatchIds = [bscs23, bscs24];
    await advisorFatima.save();

    advisorUsman.assignedBatchIds = [bsse22];
    await advisorUsman.save();

    await Batch.updateOne({ _id: bscs22 }, { advisorId: advisorAhmed._id });
    await Batch.updateOne({ _id: bscs23 }, { advisorId: advisorAhmed._id }); // Assign to Ahmed to test multiple batches switcher
    await Batch.updateOne({ _id: bscs24 }, { advisorId: advisorFatima._id });
    await Batch.updateOne({ _id: bsse22 }, { advisorId: advisorUsman._id });

    // ── Students ──
    const studentNames = [
      'Ayesha Khan', 'Ali Raza', 'Bilal Siddiqui', 'Fatima Ahmed', 'Hamza Ali',
      'Zainab Iqbal', 'Omar Farooq', 'Sana Tariq', 'Usman Ghani', 'Hira Batool',
      'Ahmed Nawaz', 'Mahnoor Sheikh', 'Saad Qureshi', 'Rabia Anwar', 'Tahir Mehmood',
      'Sadia Bashir', 'Fahad Malik', 'Noor Fatima', 'Kamran Akhtar', 'Samina Rafiq',
      'Junaid Iqbal', 'Farah Naz', 'Imran Khan', 'Saima Ashraf', 'Rizwan Ali',
      'Tania Shah', 'Nabeel Ahmed', 'Komal Rizvi', 'Shahid Mahmood', 'Iqra Aziz',
    ];

    const cgpaValues = [
      3.82, 2.05, 1.88, 3.45, 3.10,
      2.50, 1.75, 2.01, 3.90, 2.15,
      3.20, 2.00, 1.95, 3.60, 2.50,
      2.10, 3.30, 1.70, 3.75, 2.80,
      3.00, 2.08, 1.90, 3.50, 2.20,
      3.15, 2.02, 1.85, 3.40, 2.55,
    ];

    // cgpaStatus thresholds: critical < 2.0, warning <= 2.1, good > 2.1
    const batchInfoPool = [
      { batchId: bscs22, deptId: cs, code: 'BSCS', year: '22F' },
      { batchId: bscs22, deptId: cs, code: 'BSCS', year: '22S' },
      { batchId: bscs23, deptId: cs, code: 'BSCS', year: '23F' },
      { batchId: bscs23, deptId: cs, code: 'BSCS', year: '23S' },
      { batchId: bscs24, deptId: cs, code: 'BSCS', year: '24F' },
      { batchId: bsai23, deptId: ai, code: 'BSAI', year: '23F' },
      { batchId: bsai23, deptId: ai, code: 'BSAI', year: '23S' },
      { batchId: bsse22, deptId: se, code: 'BSSE', year: '22F' },
      { batchId: bsse22, deptId: se, code: 'BSSE', year: '22S' },
      { batchId: bsse23, deptId: se, code: 'BSSE', year: '23F' },
      { batchId: bscy23, deptId: cy, code: 'BSCY', year: '23F' },
      { batchId: bscy23, deptId: cy, code: 'BSCY', year: '23S' },
    ];

    let globalStudentCounter = 0;
    const students = [];
    const seedNow = new Date();
    for (let i = 0; i < 60; i++) {
      const info = batchInfoPool[i % batchInfoPool.length];
      globalStudentCounter++;
      const seqNum = String(globalStudentCounter).padStart(4, '0');

      const enrolledAt = new Date();
      enrolledAt.setMonth(enrolledAt.getMonth() - Math.floor(i / 3));

      const cgpa = cgpaValues[i % cgpaValues.length] + (Math.random() * 0.2 - 0.1);

      // BUG FIX: previously currentSemester was Math.min(8, Math.floor(i/7)+1)
      // — derived purely from the loop counter, disconnected from which
      // batch the student was placed in. Students in the identical batch
      // could land anywhere from Semester 1 to 8, which can't happen in
      // real life since promoteSemester only ever advances a whole batch
      // together. Now derived from the batch's real intake year/session,
      // with only a small +/-1 semester natural variance.
      const introYear = 2000 + parseInt(info.year.slice(0, 2), 10);
      const isSpringIntake = info.year.endsWith('S');
      const elapsedSemesters = (seedNow.getFullYear() - introYear) * 2 + (isSpringIntake ? 0 : 1);
      // NOTE: previously `(i % 3) - 1`. Since batchInfoPool has 12 entries and
      // i % 12 picks the batch/pool slot, i % 3 was fully determined by i % 12
      // (12 is a multiple of 3) — every student landing on a given pool slot
      // always got the exact same variance, so an entire intake tag (e.g. all
      // '23F' students) was hard-locked to one semester with zero real spread.
      // Randomizing breaks that aliasing and gives genuine per-student spread.
      const variance = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
      const currentSemester = Math.min(8, Math.max(1, elapsedSemesters + variance));

      students.push({
        rollNumber: `${info.code}-${info.year}-${seqNum}`,
        name: studentNames[i % studentNames.length],
        email: studentNames[i % studentNames.length].toLowerCase().replace(/\s+/g, '.') + '@stmu.edu.pk',
        departmentId: info.deptId,
        batchId: info.batchId,
        intakeSession: info.year.endsWith('S') ? 'Spring' : 'Fall',
        currentSemester,
        cgpa: Math.round(cgpa * 100) / 100,
        status: i < 45 ? 'active' : 'inactive',
        enrolledAt,
      });
    }

    await Student.insertMany(students);

    const getNextRoll = (batchId, code, year) => {
      globalStudentCounter++;
      return `${code}-${year}-${String(globalStudentCounter).padStart(4, '0')}`;
    };

    const migrationStudents = await Student.insertMany([
      {
        rollNumber: getNextRoll(bscs22, 'BSCS', '22F'),
        name: 'Ali Hassan',
        email: 'ali.hassan@stmu.edu.pk',
        phone: '0300-234-5692',
        departmentId: cs,
        batchId: bscs22,
        currentSemester: 4,
        cgpa: 3.45,
        status: 'active',
        enrolledAt: new Date('2022-02-15')
      },
      {
        rollNumber: getNextRoll(bsse22, 'BSSE', '22F'),
        name: 'Saba Khan',
        email: 'saba.khan@stmu.edu.pk',
        phone: '0312-555-4545',
        departmentId: se,
        batchId: bsse22,
        currentSemester: 4,
        cgpa: 3.10,
        status: 'active',
        enrolledAt: new Date('2022-09-15')
      },
      {
        rollNumber: getNextRoll(bscs22, 'BSCS', '22F'),
        name: 'Usama Ali',
        email: 'usama.ali@stmu.edu.pk',
        phone: '0321-456-7890',
        departmentId: cs,
        batchId: bscs22,
        currentSemester: 4,
        cgpa: 2.80,
        status: 'active',
        enrolledAt: new Date('2022-02-15')
      },
      {
        rollNumber: getNextRoll(bsai23, 'BSAI', '23F'),
        name: 'Hina Fatima',
        email: 'hina.fatima@stmu.edu.pk',
        phone: '0333-789-0123',
        departmentId: ai,
        batchId: bsai23,
        currentSemester: 3,
        cgpa: 3.20,
        status: 'active',
        enrolledAt: new Date('2023-06-15')
      },
      {
        rollNumber: getNextRoll(bscs23, 'BSCS', '23F'),
        name: 'Ahmed Raza',
        email: 'ahmed.raza@stmu.edu.pk',
        phone: '0345-987-6543',
        departmentId: cs,
        batchId: bscs23,
        currentSemester: 3,
        cgpa: 2.50,
        status: 'active',
        enrolledAt: new Date('2023-09-15')
      },
      {
        rollNumber: getNextRoll(bsse22, 'BSSE', '22F'),
        name: 'Hamza Sheikh',
        email: 'hamza.sheikh@stmu.edu.pk',
        phone: '0301-234-5678',
        departmentId: se,
        batchId: bsse22,
        currentSemester: 4,
        cgpa: 1.85,
        status: 'active',
        enrolledAt: new Date('2022-09-15')
      },
      {
        rollNumber: getNextRoll(bscy23, 'BSCY', '23F'),
        name: 'M. Abdullah',
        email: 'm.abdullah@stmu.edu.pk',
        phone: '0324-111-2222',
        departmentId: cy,
        batchId: bscy23,
        currentSemester: 2,
        cgpa: 3.65,
        status: 'active',
        enrolledAt: new Date('2023-09-15')
      }
    ]);
    const statusCounts = { good: 0, warning: 0, critical: 0 };
    for (const s of students) {
      const c = s.cgpa < 2.0 ? 'critical' : s.cgpa <= 2.1 ? 'warning' : 'good';
      statusCounts[c]++;
    }
    console.log(`  ${students.length} students (good=${statusCounts.good}, warning=${statusCounts.warning}, critical=${statusCounts.critical})`);

    // ── Curricula ──
    // ── Curricula (Official STMU HEC 8-Semester Standards) ──
    await seedHECCurriculums();

    const csCurriculum = await Curriculum.findOne({ departmentId: cs });
    const aiCurriculum = await Curriculum.findOne({ departmentId: ai });
    const seCurriculum = await Curriculum.findOne({ departmentId: se });
    const cyCurriculum = await Curriculum.findOne({ departmentId: cy });

    const curriculums = [csCurriculum, aiCurriculum, seCurriculum, cyCurriculum].filter(Boolean);
    console.log(`  ${curriculums.length} official STMU HEC curricula seeded, one per department`);

    // Pin every demo batch to its department's curriculum — same as what
    // happens automatically for real batches created through the app.
    if (csCurriculum) await Batch.updateMany({ departmentId: cs, curriculumId: null }, { curriculumId: csCurriculum._id });
    if (aiCurriculum) await Batch.updateMany({ departmentId: ai, curriculumId: null }, { curriculumId: aiCurriculum._id });
    if (seCurriculum) await Batch.updateMany({ departmentId: se, curriculumId: null }, { curriculumId: seCurriculum._id });
    if (cyCurriculum) await Batch.updateMany({ departmentId: cy, curriculumId: null }, { curriculumId: cyCurriculum._id });
    console.log(`  Pinned demo batches to their department's curriculum`);

    // ── Student Course History & Enrollment Seeding ──
    const seededStudents = await Student.find({});
    for (const student of seededStudents) {
      const studentCurriculum = curriculums.find(
        curr => curr.departmentId && curr.departmentId.toString() === student.departmentId.toString()
      ) || curriculums.find(curr => curr.isHecStandard) || curriculums[0];

      if (studentCurriculum && studentCurriculum.courses) {
        const studentCourses = [];
        studentCurriculum.courses.forEach(currCourse => {
          if (currCourse.semester < student.currentSemester) {
            // Completed courses in past semesters
            const grade = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'][Math.floor(Math.random() * 7)];
            studentCourses.push({
              courseCode: currCourse.code,
              courseTitle: currCourse.title,
              creditHours: currCourse.creditHours,
              semester: currCourse.semester,
              grade,
              enrollmentStatus: 'completed',
              status: 'completed'
            });
          } else if (currCourse.semester === student.currentSemester) {
            // Currently enrolled courses for the active semester
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
        student.courses = studentCourses;

        // Recalculate CGPA using STMU formula if student has completed courses
        if (student.currentSemester > 1) {
          const calcCgpa = calculateSTMU_CGPA(studentCourses);
          if (calcCgpa > 0) student.cgpa = calcCgpa;
        }

        await student.save();
      }
    }
    console.log(`  Dynamically seeded course histories for ${seededStudents.length} students`);

    // ── Migrations ──

    const academicAdmin = users.find(u => u.role === 'academic_admin');

    await Migration.create([
      {
        studentId: migrationStudents[0]._id,
        departmentId: cs,
        sourceInstitution: 'Punjab University',
        fromProgram: 'BS Computer Science',
        toProgram: 'BS Computer Science (STMU)',
        status: 'approved',
        transferredCourses: [
          { courseName: 'Object Oriented Programming', mappedCourseName: 'Object Oriented Programming', credits: 4, equivalencyStatus: 'accepted' },
          { courseName: 'Discrete Mathematics', mappedCourseName: 'IDS - III', credits: 3, equivalencyStatus: 'accepted' },
          { courseName: 'Calculus I', mappedCourseName: 'Calculus & Analytical Geometry (IDS I)', credits: 3, equivalencyStatus: 'accepted' },
          { courseName: 'English Composition', mappedCourseName: 'Functional English', credits: 3, equivalencyStatus: 'accepted' },
          { courseName: 'Digital Logic Design', mappedCourseName: 'Digital Logic Design', credits: 4, equivalencyStatus: 'pending' },
          { courseName: 'Pakistan Studies', mappedCourseName: 'Pakistan Studies', credits: 2, equivalencyStatus: 'rejected' },
        ],
        curriculumComparison: {
          fromRequiredCredits: 130,
          toRequiredCredits: 136,
          fromCompletedCredits: 48,
          toCompletedCredits: 36,
          fromRemainingCredits: 90,
          toRemainingCredits: 100,
          fromDurationSemesters: 8,
          toDurationSemesters: 8,
          expectedCompletion: 'Spring 2028'
        },
        missingCourses: [
          { courseCode: 'CS-104', courseTitle: 'Data Structures', creditHours: 4 },
          { courseCode: 'CS-109', courseTitle: 'Design & Analysis of Algorithms', creditHours: 3 },
          { courseCode: 'CS-108', courseTitle: 'Computer Organization & Architecture', creditHours: 3 },
          { courseCode: 'CS-105', courseTitle: 'Database Systems', creditHours: 4 },
          { courseCode: 'CS-106', courseTitle: 'Operating Systems', creditHours: 4 }
        ],
        decidedBy: academicAdmin._id,
        decidedAt: new Date('2026-05-21'),
        remarks: 'All accepted courses meet the curriculum equivalency criteria. Student is eligible for credit transfer.'
      },
      {
        studentId: migrationStudents[1]._id,
        departmentId: se,
        sourceInstitution: 'Fast-NUCES',
        fromProgram: 'BS Software Engineering',
        toProgram: 'BS Software Engineering (STMU)',
        status: 'approved',
        transferredCourses: [
          { courseName: 'Programming Fundamentals', mappedCourseName: 'Programming Fundamentals', credits: 4, equivalencyStatus: 'accepted' },
          { courseName: 'Introduction to ICT', mappedCourseName: 'Applications of Information and Communication Technologies', credits: 3, equivalencyStatus: 'accepted' },
          { courseName: 'Calculus II', mappedCourseName: 'Linear Algebra (IDS II)', credits: 3, equivalencyStatus: 'accepted' }
        ],
        curriculumComparison: {
          fromRequiredCredits: 130,
          toRequiredCredits: 136,
          fromCompletedCredits: 30,
          toCompletedCredits: 30,
          fromRemainingCredits: 100,
          toRemainingCredits: 106,
          fromDurationSemesters: 8,
          toDurationSemesters: 8,
          expectedCompletion: 'Fall 2028'
        },
        missingCourses: [
          { courseCode: 'CS-107', courseTitle: 'Software Engineering', creditHours: 3 }
        ],
        decidedBy: academicAdmin._id,
        decidedAt: new Date('2026-05-19'),
        remarks: 'Course outlines match required standards.'
      },
      {
        studentId: migrationStudents[2]._id,
        departmentId: cs,
        sourceInstitution: 'National University',
        fromProgram: 'BS Computer Science',
        toProgram: 'BS Computer Science (STMU)',
        status: 'approved',
        transferredCourses: [
          { courseName: 'Differential Equations', mappedCourseName: 'IDS - III', credits: 3, equivalencyStatus: 'accepted' },
          { courseName: 'Linear Algebra', mappedCourseName: 'Linear Algebra (IDS II)', credits: 3, equivalencyStatus: 'accepted' }
        ],
        curriculumComparison: {
          fromRequiredCredits: 130,
          toRequiredCredits: 136,
          fromCompletedCredits: 24,
          toCompletedCredits: 24,
          fromRemainingCredits: 106,
          toRemainingCredits: 112,
          fromDurationSemesters: 8,
          toDurationSemesters: 8,
          expectedCompletion: 'Spring 2029'
        },
        missingCourses: [
          { courseCode: 'CS-101', courseTitle: 'Programming Fundamentals', creditHours: 4 }
        ],
        decidedBy: academicAdmin._id,
        decidedAt: new Date('2026-05-18'),
        remarks: 'Transferred 2 basic math courses.'
      },
      {
        studentId: migrationStudents[3]._id,
        departmentId: cs,
        sourceInstitution: 'Lahore Garrison Univ.',
        fromProgram: 'BS Artificial Intelligence',
        toProgram: 'BS Computer Science (STMU)',
        status: 'pending',
        transferredCourses: [
          { courseName: 'Introduction to AI', mappedCourseName: 'Artificial Intelligence', credits: 3, equivalencyStatus: 'pending' },
          { courseName: 'Programming Fundamentals', mappedCourseName: 'Programming Fundamentals', credits: 4, equivalencyStatus: 'pending' }
        ],
        curriculumComparison: {
          fromRequiredCredits: 130,
          toRequiredCredits: 136,
          fromCompletedCredits: 18,
          toCompletedCredits: 18,
          fromRemainingCredits: 112,
          toRemainingCredits: 118,
          fromDurationSemesters: 8,
          toDurationSemesters: 8,
          expectedCompletion: 'Fall 2029'
        },
        missingCourses: [
          { courseCode: 'CS-102', courseTitle: 'Object Oriented Programming', creditHours: 4 }
        ]
      },
      {
        studentId: migrationStudents[4]._id,
        departmentId: cs,
        sourceInstitution: 'UET Lahore',
        fromProgram: 'BS Cyber Security',
        toProgram: 'BS Computer Science (STMU)',
        status: 'pending',
        transferredCourses: [
          { courseName: 'Information Security', mappedCourseName: 'Information Security', credits: 3, equivalencyStatus: 'pending' },
          { courseName: 'Discrete Structures', mappedCourseName: 'IDS - III', credits: 3, equivalencyStatus: 'pending' }
        ],
        curriculumComparison: {
          fromRequiredCredits: 130,
          toRequiredCredits: 136,
          fromCompletedCredits: 20,
          toCompletedCredits: 20,
          fromRemainingCredits: 110,
          toRemainingCredits: 116,
          fromDurationSemesters: 8,
          toDurationSemesters: 8,
          expectedCompletion: 'Fall 2029'
        },
        missingCourses: [
          { courseCode: 'CS-104', courseTitle: 'Data Structures', creditHours: 4 }
        ]
      },
      {
        studentId: migrationStudents[5]._id,
        departmentId: se,
        sourceInstitution: 'University of Sargodha',
        fromProgram: 'BS Software Engineering',
        toProgram: 'BS Software Engineering (STMU)',
        status: 'rejected',
        transferredCourses: [
          { courseName: 'Database Systems', mappedCourseName: 'Database Systems', credits: 4, equivalencyStatus: 'rejected' }
        ],
        curriculumComparison: {
          fromRequiredCredits: 130,
          toRequiredCredits: 136,
          fromCompletedCredits: 12,
          toCompletedCredits: 0,
          fromRemainingCredits: 118,
          toRemainingCredits: 136,
          fromDurationSemesters: 8,
          toDurationSemesters: 8,
          expectedCompletion: 'Spring 2030'
        },
        missingCourses: [
          { courseCode: 'CS-107', courseTitle: 'Software Engineering', creditHours: 3 }
        ],
        decidedBy: academicAdmin._id,
        decidedAt: new Date('2026-05-14'),
        remarks: 'Course content did not match our curriculum requirements for SE.'
      },
      {
        studentId: migrationStudents[6]._id,
        departmentId: cs,
        sourceInstitution: 'COMSATS Wah',
        fromProgram: 'BS Artificial Intelligence',
        toProgram: 'BS Computer Science (STMU)',
        status: 'approved',
        transferredCourses: [
          { courseName: 'Linear Algebra', mappedCourseName: 'Linear Algebra (IDS II)', credits: 3, equivalencyStatus: 'accepted' }
        ],
        curriculumComparison: {
          fromRequiredCredits: 130,
          toRequiredCredits: 136,
          fromCompletedCredits: 15,
          toCompletedCredits: 15,
          fromRemainingCredits: 115,
          toRemainingCredits: 121,
          fromDurationSemesters: 8,
          toDurationSemesters: 8,
          expectedCompletion: 'Fall 2029'
        },
        missingCourses: [
          { courseCode: 'CS-103', courseTitle: 'Digital Logic Design', creditHours: 4 }
        ],
        decidedBy: academicAdmin._id,
        decidedAt: new Date('2026-05-13'),
        remarks: 'Math course equivalency is approved.'
      }
    ]);
    console.log(`  7 migration records`);

    // ── Approval Requests ──
    const csStudents = await Student.find({ departmentId: cs }).limit(5);
    const csAdvisor = users.find(u => u.email === 'advisor.cs@stmu.edu.pk');

    if (csStudents.length >= 2) {
      await ApprovalRequest.insertMany([
        {
          studentId: csStudents[0]._id,
          advisorId: csAdvisor._id,
          departmentId: cs,
          batchId: csStudents[0].batchId,
          courseCode: 'CS-104',
          courseTitle: 'Data Structures',
          creditHours: 4,
          requestType: 'add',
          justification: 'Want to catch up with degree roadmap early.',
          status: 'advisor_approved',
          currentApproverRole: 'hod',
          submittedBy: csAdvisor._id,
          advisorRemarks: 'Student has a strong CGPA, recommended for approval.',
          prereqCheck: 'Passed',
          duplicateWarning: ''
        },
        {
          studentId: csStudents[1]._id,
          advisorId: csAdvisor._id,
          departmentId: cs,
          batchId: csStudents[1].batchId,
          courseCode: 'CS-105',
          courseTitle: 'Database Systems',
          creditHours: 4,
          requestType: 'add',
          justification: 'Required for internship prerequisite.',
          status: 'pending',
          currentApproverRole: 'advisor',
          submittedBy: csAdvisor._id,
          advisorRemarks: '',
          prereqCheck: 'Passed',
          duplicateWarning: ''
        }
      ]);
      console.log('  2 approval requests');
    }

    console.log('\nSeeding complete!');
    console.log('\nTest logins (password: password123):');
    console.log('  Administrator (CS only): admin.cs@stmu.edu.pk / password123 / academic_admin');
    console.log('  Administrator (CS+SE):   admin.both@stmu.edu.pk / password123 / academic_admin');
    console.log('  Dean:                    dean@stmu.edu.pk / password123 / dean');
    console.log('  Batch Advisor:           advisor.cs@stmu.edu.pk / password123 / advisor');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();