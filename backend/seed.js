import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './utils/db.js';
import User from './models/user.js';
import Department from './models/department.js';
import Batch from './models/batch.js';
import Student from './models/student.js';
import Curriculum from './models/curriculum.js';
import Migration from './models/migration.js';

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
      { name: 'Advisor Ahmed', email: 'advisor.ahmed@stmu.edu.pk', password: 'password123', role: 'advisor', dept: 'Computer Science', status: 'Active' },
      { name: 'Advisor Fatima', email: 'advisor.fatima@stmu.edu.pk', password: 'password123', role: 'advisor', dept: 'Computer Science', status: 'Active' },
      { name: 'Advisor Usman', email: 'advisor.usman@stmu.edu.pk', password: 'password123', role: 'advisor', dept: 'Software Engineering', status: 'Active' },
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
    const advisorAhmed = users.find(u => u.email === 'advisor.ahmed@stmu.edu.pk');
    const advisorFatima = users.find(u => u.email === 'advisor.fatima@stmu.edu.pk');
    const advisorUsman = users.find(u => u.email === 'advisor.usman@stmu.edu.pk');

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

    // ── Migrations ──
    const migStudent = await Student.findOne({ departmentId: cs }).sort({ rollNumber: 1 });
    if (migStudent) {
      await Migration.create({
        studentId: migStudent._id,
        departmentId: cs,
        sourceInstitution: 'NUST School of Electrical Engineering & Computer Science',
        transferredCourses: [
          { courseName: 'Introduction to Programming', credits: 4, equivalencyStatus: 'pending' },
          { courseName: 'Calculus I', credits: 3, equivalencyStatus: 'pending' },
          { courseName: 'English Composition', credits: 3, equivalencyStatus: 'pending' },
          { courseName: 'Discrete Mathematics', credits: 3, equivalencyStatus: 'pending' },
        ],
      });
      console.log('  1 migration record');
    }

    console.log('\nSeeding complete!');
    console.log('\nTest logins (password: password123):');
    console.log('  Administrator (CS only): admin.cs@stmu.edu.pk / password123 / academic_admin');
    console.log('  Administrator (CS+SE):   admin.both@stmu.edu.pk / password123 / academic_admin');
    console.log('  Super Admin:             superadmin@stmu.edu.pk / password123 / super_admin');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
