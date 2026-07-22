import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/student.js';
import Curriculum from './models/curriculum.js';
import AuditLog from './models/auditLog.js';
import Batch from './models/batch.js';
import { createOrUpdateCurriculumMap } from './controllers/curriculumController.js';
import { 
  createStudent, 
  getAllStudents, 
  getStudentById, 
  updateStudent, 
  deleteStudent, 
  bulkUploadStudents,
  syncLmsRecords,
  promoteSemester 
} from './controllers/studentController.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/batchminder';

const runTests = async () => {
  console.log('Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log('Connected.');

  // Clear existing test data to start fresh
  console.log('Cleaning up old test data...');
  await Student.deleteMany({ rollNumber: { $in: ['BSCS-22-0001', 'BSCS-22-0002'] } });
  await Curriculum.deleteMany({ batch: '2022', department: 'Computer Science' });
  await Batch.deleteMany({ code: '2022' });
  await AuditLog.deleteMany({});

  // Mock Response Helper Creator
  const createMockResponse = () => {
    const res = {};
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.body = data;
      return res;
    };
    return res;
  };

  try {
    console.log('\n--- STARTING MODULE 2 BACKEND TEST SUITE ---\n');

    // ==========================================
    // TEST 1: Curriculum Mapping Creation
    // ==========================================
    console.log('Test 1: Creating Curriculum Map for Computer Science (Batch 2022, Semester 2)...');
    
    const req1 = {
      body: {
        department: 'Computer Science',
        batch: '2022',
        semester: 2,
        courses: [
          { courseCode: 'CS-201', title: 'Data Structures & Algorithms', creditHours: 4, prerequisites: ['CS-101'] },
          { courseCode: 'CS-202', title: 'Digital Logic Design', creditHours: 3, prerequisites: [] }
        ]
      },
      user: { email: 'admin@batchminder.edu', _id: new mongoose.Types.ObjectId() }
    };
    const res1 = createMockResponse();
    
    await createOrUpdateCurriculumMap(req1, res1);
    
    if (res1.statusCode !== 200) {
      throw new Error(`Curriculum creation failed with code ${res1.statusCode}: ${JSON.stringify(res1.body)}`);
    }
    
    const curriculumRecord = await Curriculum.findOne({ department: 'Computer Science', batch: '2022', semester: 2 });
    if (!curriculumRecord || curriculumRecord.courses.length !== 2) {
      throw new Error('Curriculum map was not found or has incorrect courses count in database.');
    }
    console.log('✔ Test 1 Passed: Curriculum map created successfully.');


    // ==========================================
    // TEST 2: Bulk CSV Student Records Ingestion
    // ==========================================
    console.log('\nTest 2: Bulk uploading students via CSV parsing...');
    
    const csvContent = 
`rollNumber,name,email,batch,department,cgpa,status
BSCS-22-0001,Alice Johnson,alice@uni.edu,2022,Computer Science,3.8,good_standing
BSCS-22-0002,Bob Smith,bob@uni.edu,2022,Computer Science,2.2,warning`;

    const req2 = {
      file: {
        buffer: Buffer.from(csvContent),
        originalname: 'students.csv'
      },
      user: { email: 'advisor@batchminder.edu', _id: new mongoose.Types.ObjectId() }
    };
    const res2 = createMockResponse();
    const mockNext = (err) => { if (err) throw err; };

    await bulkUploadStudents(req2, res2, mockNext);

    if (res2.statusCode !== 200) {
      throw new Error(`Bulk upload failed with code ${res2.statusCode}: ${JSON.stringify(res2.body)}`);
    }

    const alice = await Student.findOne({ rollNumber: 'BSCS-22-0001' });
    const bob = await Student.findOne({ rollNumber: 'BSCS-22-0002' });

    if (!alice || alice.name !== 'Alice Johnson' || !bob || bob.name !== 'Bob Smith') {
      throw new Error('CSV upload parsed profiles incorrectly or failed to save to MongoDB.');
    }
    console.log('✔ Test 2 Passed: CSV parsed and bulk-upserted students successfully.');


    // ==========================================
    // TEST 3: CRUD - Retrieve All Students (Filtered)
    // ==========================================
    console.log('\nTest 3: Fetching all students filtered by batch...');
    
    const req3 = {
      query: { batch: '2022', department: 'Computer Science' }
    };
    const res3 = createMockResponse();

    await getAllStudents(req3, res3);

    if (res3.statusCode !== 200 || res3.body.results !== 2) {
      throw new Error(`Retrieve failed or returned incorrect count: ${JSON.stringify(res3.body)}`);
    }
    console.log('✔ Test 3 Passed: Students query list retrieved successfully.');


    // Find the batch that was dynamically created in Test 2
    const batch2022 = await Batch.findOne({ code: /2022/i });
    
    const req4 = {
      params: { id: 'BSCS-22-0002' },
      body: {
        cgpa: 1.8,
        status: 'critical',
        courses: [
          { courseCode: 'CS-101', courseTitle: 'Introduction to Programming', creditHours: 4, grade: 'IP', status: 'enrolled' }
        ]
      },
      user: {
        email: 'advisor@batchminder.edu',
        _id: new mongoose.Types.ObjectId(),
        role: 'advisor',
        assignedBatchIds: batch2022 ? [batch2022._id] : []
      }
    };
    const res4 = createMockResponse();

    await updateStudent(req4, res4);

    if (res4.statusCode !== 200) {
      throw new Error(`Update profile failed: ${JSON.stringify(res4.body)}`);
    }

    const updatedBob = await Student.findOne({ rollNumber: 'BSCS-22-0002' });
    if (updatedBob.cgpa !== 1.8 || updatedBob.status !== 'critical' || updatedBob.courses.length !== 1) {
      throw new Error('Student profile properties did not update correctly.');
    }
    console.log('✔ Test 4 Passed: Student record updated successfully.');


    // ==========================================
    // TEST 5: LMS Grade and Attendance Mock Sync
    // ==========================================
    console.log('\nTest 5: Triggering LMS/ERP synchronization simulation...');
    
    const req5 = {
      body: { batch: '2022', department: 'Computer Science' }
    };
    const res5 = createMockResponse();

    await syncLmsRecords(req5, res5);

    if (res5.statusCode !== 200) {
      throw new Error(`LMS Sync endpoint failed: ${JSON.stringify(res5.body)}`);
    }

    const syncedBob = await Student.findOne({ rollNumber: 'BSCS-22-0002' });
    const course = syncedBob.courses[0];
    
    if (course.grade === 'IP' || course.status === 'enrolled') {
      throw new Error('LMS Sync failed to update student course progress statuses or grades.');
    }
    console.log(`✔ Test 5 Passed: LMS synchronized successfully. Bob's grade: ${course.grade}, Status: ${syncedBob.status}`);


    // ==========================================
    // TEST 6: Batch Promotion with Curriculum Mapping
    // ==========================================
    console.log('\nTest 6: Promoting batch to next semester level and linking curriculum mapping...');
    
    const req6 = {
      body: { batch: '2022', department: 'Computer Science' },
      user: { email: 'admin@batchminder.edu', _id: new mongoose.Types.ObjectId() }
    };
    const res6 = createMockResponse();

    await promoteSemester(req6, res6);

    if (res6.statusCode !== 200) {
      throw new Error(`Batch promotion migration failed: ${JSON.stringify(res6.body)}`);
    }

    const promotedAlice = await Student.findOne({ rollNumber: 'BSCS-22-0001' });
    
    if (promotedAlice.currentSemester !== 2) {
      throw new Error(`Semester did not increment correctly. Got: ${promotedAlice.currentSemester}`);
    }

    // Verify curriculum mapping link worked: next semester's courses should be enrolled
    const semester2Courses = promotedAlice.courses.filter(c => c.semester === 2);
    if (semester2Courses.length !== 2) {
      throw new Error(`Student was not enrolled in the 2 courses from the Semester 2 Curriculum Map. Count: ${semester2Courses.length}`);
    }

    const dsaCourse = promotedAlice.courses.find(c => c.courseCode === 'CS-201');
    if (!dsaCourse || dsaCourse.status !== 'enrolled' || dsaCourse.grade !== 'IP') {
      throw new Error('Student was enrolled in the next semester course, but status/grade properties are incorrect.');
    }
    console.log('✔ Test 6 Passed: Batch semester promotion and curriculum integration executed successfully.');


    // ==========================================
    // TEST 7: Audit Log Verification
    // ==========================================
    console.log('\nTest 7: Verifying audit logging records...');
    const auditCount = await AuditLog.countDocuments({
      description: { $regex: 'Computer Science', $options: 'i' }
    });
    
    if (auditCount === 0) {
      throw new Error('No audit records were logged in the database for the test operations.');
    }
    console.log(`✔ Test 7 Passed: Successfully verified ${auditCount} audit trail entries for Module 2.`);

    console.log('\n--- ALL MODULE 2 BACKEND TESTS COMPLETED SUCCESSFULLY! ---\n');

  } catch (error) {
    console.error('\n✖ TEST SUITE FAILED WITH ERROR:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
};

runTests();
