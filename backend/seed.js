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
      { code: 'SE', name: 'Software Engineering', established: 2019, status: 'Active', color: '#7C3AED' },
      { code: 'EE', name: 'Electrical Engineering', established: 2020, status: 'Active', color: '#EF4444' },
    ]);
    const [cs, se, ee] = depts.map(d => d._id);
    console.log(`  ${depts.length} departments`);

    // ── Users ──
    const users = await User.create([
      { name: 'Super Admin User', email: 'superadmin@stmu.edu.pk', password: 'password123', role: 'super_admin', status: 'Active' },
      { name: 'Admin CS Only', email: 'admin.cs@stmu.edu.pk', password: 'password123', role: 'academic_admin', departmentIds: [cs], dept: 'Computer Science', status: 'Active' },
      { name: 'Admin CS+SE', email: 'admin.both@stmu.edu.pk', password: 'password123', role: 'academic_admin', departmentIds: [cs, se], dept: 'All Departments', status: 'Active' },
      { name: 'HOD Computer Science', email: 'hod.cs@stmu.edu.pk', password: 'password123', role: 'admin', departmentIds: [cs], dept: 'Computer Science', status: 'Active' },
      { name: 'HOD Software Engineering', email: 'hod.se@stmu.edu.pk', password: 'password123', role: 'admin', departmentIds: [se], dept: 'Software Engineering', status: 'Active' },
      { name: 'Advisor Ahmed', email: 'advisor.both@stmu.edu.pk', password: 'password123', role: 'advisor', dept: 'Computer Science', status: 'Active' },
      { name: 'Advisor Fatima', email: 'batchadvisor@stmu.edu.pk', password: 'password123', role: 'advisor', dept: 'Computer Science', status: 'Active' },
      { name: 'Advisor Usman', email: 'advisor.se@stmu.edu.pk', password: 'password123', role: 'advisor', dept: 'Software Engineering', status: 'Active' },
      { name: 'HOD Electrical Engineering', email: 'hod.ee@stmu.edu.pk', password: 'password123', role: 'admin', departmentIds: [ee], dept: 'Electrical Engineering', status: 'Active' },
    ]);
    console.log(`  ${users.length} users`);

    // Update HOD references on departments
    const hodCS = users.find(u => u.email === 'hod.cs@stmu.edu.pk');
    const hodSE = users.find(u => u.email === 'hod.se@stmu.edu.pk');
    const hodEE = users.find(u => u.email === 'hod.ee@stmu.edu.pk');
    await Department.updateOne({ _id: cs }, { hodId: hodCS._id });
    await Department.updateOne({ _id: se }, { hodId: hodSE._id });
    await Department.updateOne({ _id: ee }, { hodId: hodEE._id });

    // ── Batches ──
    const batches = await Batch.insertMany([
      { code: 'BSCS-2022', departmentId: cs, startYear: 2022, advisor: 'Advisor Ahmed', status: 'Allocated' },
      { code: 'BSCS-2023', departmentId: cs, startYear: 2023, advisor: 'Advisor Fatima', status: 'Allocated' },
      { code: 'BSCS-2024', departmentId: cs, startYear: 2024, advisor: 'Unassigned', status: 'Unassigned' },
      { code: 'BSSE-2022', departmentId: se, startYear: 2022, advisor: 'Advisor Usman', status: 'Allocated' },
      { code: 'BSSE-2023', departmentId: se, startYear: 2023, advisor: 'Unassigned', status: 'Unassigned' },
      { code: 'BSEE-2022', departmentId: ee, startYear: 2022, advisor: 'Unassigned', status: 'Unassigned' },
    ]);
    const [bscs22, bscs23, bscs24, bsse22, bsse23, bsee22] = batches.map(b => b._id);
    console.log(`  ${batches.length} batches`);

    // Assign batches to advisors
    const advisorAhmed = users.find(u => u.email === 'advisor.both@stmu.edu.pk');
    const advisorFatima = users.find(u => u.email === 'batchadvisor@stmu.edu.pk');
    const advisorUsman = users.find(u => u.email === 'advisor.se@stmu.edu.pk');

    advisorAhmed.assignedBatchIds = [bscs22, bscs23];
    await advisorAhmed.save();

    advisorFatima.assignedBatchIds = [bscs23];
    await advisorFatima.save();

    advisorUsman.assignedBatchIds = [bsse22];
    await advisorUsman.save();

    await Batch.updateOne({ _id: bscs22 }, { advisorId: advisorAhmed._id });
    await Batch.updateOne({ _id: bscs23 }, { advisorId: advisorAhmed._id }); // Assign to Ahmed to test multiple batches switcher
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
    const batchPool = [bscs22, bscs23, bscs24, bsse22, bsse23, bsee22];
    const deptPool = [cs, cs, cs, se, se, ee];

    const students = [];
    for (let i = 0; i < 60; i++) {
      const batchIdx = i % 6;
      const enrolledAt = new Date();
      enrolledAt.setMonth(enrolledAt.getMonth() - Math.floor(i / 3));

      const cgpa = cgpaValues[i % cgpaValues.length] + (Math.random() * 0.2 - 0.1);

      students.push({
        rollNumber: `F22-${i < 30 ? 'BCS' : i < 50 ? 'BSSE' : 'BSEE'}-${String(i + 1).padStart(3, '0')}`,
        name: studentNames[i % studentNames.length],
        email: studentNames[i % studentNames.length].toLowerCase().replace(/\s+/g, '.') + '@stmu.edu.pk',
        departmentId: deptPool[batchIdx],
        batchId: batchPool[batchIdx],
        currentSemester: Math.min(8, Math.floor(i / 7) + 1),
        cgpa: Math.round(cgpa * 100) / 100,
        status: i < 45 ? 'active' : 'inactive',
        enrolledAt,
      });
    }

    await Student.insertMany(students);
    const statusCounts = { good: 0, warning: 0, critical: 0 };
    for (const s of students) {
      const c = s.cgpa < 2.0 ? 'critical' : s.cgpa <= 2.1 ? 'warning' : 'good';
      statusCounts[c]++;
    }
    console.log(`  ${students.length} students (good=${statusCounts.good}, warning=${statusCounts.warning}, critical=${statusCounts.critical})`);

    // ── Curricula ──
    const courseTemplates = [
      // CS courses
      { code: 'CS101', title: 'Programming Fundamentals', creditHours: 4, semester: 1, deptIdx: 0 },
      { code: 'CS102', title: 'Object Oriented Programming', creditHours: 4, semester: 2, deptIdx: 0 },
      { code: 'CS201', title: 'Data Structures', creditHours: 3, semester: 3, deptIdx: 0 },
      { code: 'CS202', title: 'Database Systems', creditHours: 3, semester: 4, deptIdx: 0 },
      { code: 'CS301', title: 'Operating Systems', creditHours: 3, semester: 5, deptIdx: 0 },
      { code: 'CS302', title: 'Computer Networks', creditHours: 3, semester: 6, deptIdx: 0 },
      { code: 'CS401', title: 'Artificial Intelligence', creditHours: 3, semester: 7, deptIdx: 0 },
      { code: 'CS402', title: 'Final Year Project', creditHours: 3, semester: 8, deptIdx: 0 },
      // SE courses
      { code: 'SE101', title: 'Intro to Software Engineering', creditHours: 3, semester: 1, deptIdx: 1 },
      { code: 'SE102', title: 'Requirements Engineering', creditHours: 3, semester: 2, deptIdx: 1 },
      { code: 'SE201', title: 'Software Design & Architecture', creditHours: 3, semester: 3, deptIdx: 1 },
      { code: 'SE202', title: 'Software Quality Assurance', creditHours: 3, semester: 4, deptIdx: 1 },
      { code: 'SE301', title: 'Software Project Management', creditHours: 3, semester: 5, deptIdx: 1 },
      { code: 'SE302', title: 'Human Computer Interaction', creditHours: 3, semester: 6, deptIdx: 1 },
      // EE courses
      { code: 'EE101', title: 'Circuit Analysis', creditHours: 3, semester: 1, deptIdx: 2 },
      { code: 'EE102', title: 'Digital Logic Design', creditHours: 3, semester: 2, deptIdx: 2 },
      { code: 'EE201', title: 'Electronic Devices & Circuits', creditHours: 3, semester: 3, deptIdx: 2 },
      { code: 'EE202', title: 'Signals & Systems', creditHours: 3, semester: 4, deptIdx: 2 },
    ];

    const curriculums = [];
    const curriculumBatches = [
      { batchId: bscs22, deptId: cs, version: '1.0', courses: courseTemplates.filter(c => c.deptIdx === 0) },
      { batchId: bscs23, deptId: cs, version: '1.0', courses: courseTemplates.filter(c => c.deptIdx === 0) },
      { batchId: bscs24, deptId: cs, version: '2.0', courses: courseTemplates.filter(c => c.deptIdx === 0) },
      { batchId: bsse22, deptId: se, version: '1.0', courses: courseTemplates.filter(c => c.deptIdx === 1) },
      { batchId: bsse23, deptId: se, version: '1.0', courses: courseTemplates.filter(c => c.deptIdx === 1) },
      { batchId: bsee22, deptId: ee, version: '1.0', courses: courseTemplates.filter(c => c.deptIdx === 2) },
    ];

    for (const cb of curriculumBatches) {
      const curr = await Curriculum.create({
        departmentId: cb.deptId,
        batchId: cb.batchId,
        version: cb.version,
        status: 'active',
        courses: cb.courses.map(c => ({
          code: c.code,
          title: c.title,
          creditHours: c.creditHours,
          semester: c.semester,
          prerequisiteCourseIds: [],
        })),
      });
      curriculums.push(curr);

      await Batch.updateOne({ _id: cb.batchId }, { curriculumVersionId: curr._id });
    }
    console.log(`  ${curriculums.length} curricula`);

    // ── Student Course History & Enrollment Seeding ──
    const seededStudents = await Student.find({});
    for (const student of seededStudents) {
      const studentCurriculum = curriculums.find(
        curr => curr.departmentId.toString() === student.departmentId.toString() &&
          curr.batchId.toString() === student.batchId.toString()
      );
      if (studentCurriculum) {
        const studentCourses = [];
        studentCurriculum.courses.forEach(currCourse => {
          if (currCourse.semester < student.currentSemester) {
            // Completed courses in past semesters
            studentCourses.push({
              courseCode: currCourse.code,
              courseTitle: currCourse.title,
              creditHours: currCourse.creditHours,
              semester: currCourse.semester,
              grade: ['A', 'B+', 'B', 'C+', 'C'][Math.floor(Math.random() * 5)],
              enrollmentStatus: 'completed',
              attendance: Math.floor(Math.random() * 20) + 80
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
              attendance: Math.floor(Math.random() * 15) + 85
            });
          }
        });
        student.courses = studentCourses;
        await student.save();
      }
    }
    console.log(`  Dynamically seeded course histories for ${seededStudents.length} students`);

    // ── Migrations ──
    const migrationStudents = await Student.insertMany([
      {
        rollNumber: 'BSCS-22B-0092',
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
        rollNumber: 'BSSE-22F-0045',
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
        rollNumber: 'BSCS-22B-0154',
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
        rollNumber: 'BBAI-23S-0023',
        name: 'Hina Fatima',
        email: 'hina.fatima@stmu.edu.pk',
        phone: '0333-789-0123',
        departmentId: cs,
        batchId: bscs23,
        currentSemester: 3,
        cgpa: 3.20,
        status: 'active',
        enrolledAt: new Date('2023-06-15')
      },
      {
        rollNumber: 'BSCS-23F-0088',
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
        rollNumber: 'BSCS-22F-0071',
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
        rollNumber: 'BSAS-24F-0010',
        name: 'M. Abdullah',
        email: 'm.abdullah@stmu.edu.pk',
        phone: '0324-111-2222',
        departmentId: cs,
        batchId: bscs24,
        currentSemester: 2,
        cgpa: 3.65,
        status: 'active',
        enrolledAt: new Date('2024-09-15')
      }
    ]);

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
          { courseName: 'Object Oriented Programming', mappedCourseName: 'Object Oriented Programming', credits: 3, equivalencyStatus: 'accepted' },
          { courseName: 'Discrete Mathematics', mappedCourseName: 'Discrete Mathematics', credits: 3, equivalencyStatus: 'accepted' },
          { courseName: 'Calculus I', mappedCourseName: 'Calculus & Analytical Geometry', credits: 3, equivalencyStatus: 'accepted' },
          { courseName: 'English Composition', mappedCourseName: 'Functional English', credits: 3, equivalencyStatus: 'accepted' },
          { courseName: 'Digital Logic Design', mappedCourseName: 'Digital Logic Design', credits: 3, equivalencyStatus: 'pending' },
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
          { courseCode: 'CS-201', courseTitle: 'Data Structures', creditHours: 3 },
          { courseCode: 'CS-202', courseTitle: 'Algorithms', creditHours: 3 },
          { courseCode: 'CS-301', courseTitle: 'Computer Organization', creditHours: 3 },
          { courseCode: 'CS-302', courseTitle: 'Database Systems', creditHours: 3 },
          { courseCode: 'CS-401', courseTitle: 'Operating Systems', creditHours: 3 }
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
          { courseName: 'Introduction to ICT', mappedCourseName: 'Introduction to ICT', credits: 3, equivalencyStatus: 'accepted' },
          { courseName: 'Calculus II', mappedCourseName: 'Calculus II', credits: 3, equivalencyStatus: 'accepted' }
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
          { courseCode: 'SE-201', courseTitle: 'Software Requirement Eng', creditHours: 3 },
          { courseCode: 'SE-202', courseTitle: 'Software Design', creditHours: 3 }
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
          { courseName: 'Differential Equations', mappedCourseName: 'Differential Equations', credits: 3, equivalencyStatus: 'accepted' },
          { courseName: 'Linear Algebra', mappedCourseName: 'Linear Algebra', credits: 3, equivalencyStatus: 'accepted' }
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
          { courseCode: 'CS-101', courseTitle: 'Intro to CS', creditHours: 3 }
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
          { courseName: 'Introduction to AI', mappedCourseName: 'Introduction to AI', credits: 3, equivalencyStatus: 'pending' },
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
          { courseCode: 'CS-102', courseTitle: 'Object Oriented Programming', creditHours: 3 }
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
          { courseName: 'Discrete Structures', mappedCourseName: 'Discrete Structures', credits: 3, equivalencyStatus: 'pending' }
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
          { courseCode: 'CS-103', courseTitle: 'Data Structures', creditHours: 3 }
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
          { courseCode: 'SE-101', courseTitle: 'Introduction to SE', creditHours: 3 }
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
          { courseName: 'Linear Algebra', mappedCourseName: 'Linear Algebra', credits: 3, equivalencyStatus: 'accepted' }
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
          { courseCode: 'CS-104', courseTitle: 'Digital Logic Design', creditHours: 3 }
        ],
        decidedBy: academicAdmin._id,
        decidedAt: new Date('2026-05-13'),
        remarks: 'Math course equivalency is approved.'
      }
    ]);
    console.log(`  7 migration records`);

    // ── Approval Requests ──
    const csStudents = await Student.find({ departmentId: cs }).limit(5);
    const csAdvisor = users.find(u => u.email === 'advisor.both@stmu.edu.pk');

    if (csStudents.length >= 2) {
      await ApprovalRequest.insertMany([
        {
          studentId: csStudents[0]._id,
          advisorId: csAdvisor._id,
          departmentId: cs,
          batchId: csStudents[0].batchId,
          courseCode: 'CS201',
          courseTitle: 'Data Structures',
          creditHours: 3,
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
          courseCode: 'CS202',
          courseTitle: 'Database Systems',
          creditHours: 3,
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
    console.log('  Super Admin:             superadmin@stmu.edu.pk / password123 / super_admin');
    console.log('  Batch Advisor:           batchadvisor@stmu.edu.pk / password123 / advisor');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
