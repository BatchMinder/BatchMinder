import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/student.js';
import Curriculum from './models/curriculum.js';
import Batch from './models/batch.js';
import AuditLog from './models/auditLog.js';
import Notification from './models/notification.js';
import Department from './models/department.js';

dotenv.config();

const cleanTestRecords = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/batchminder';
    await mongoose.connect(mongoUri);
    
    // 1. Delete Students
    const studentsDeleted = await Student.deleteMany({
      rollNumber: { $in: ['BSCS-22-0001', 'BSCS-22-0002'] }
    });
    console.log(`Deleted test students: ${studentsDeleted.deletedCount}`);

    // 2. Delete Curriculum Maps
    const curriculumsDeleted = await Curriculum.deleteMany({
      batch: '2022',
      department: 'Computer Science',
      version: '1.0'
    });
    console.log(`Deleted test curriculum maps: ${curriculumsDeleted.deletedCount}`);

    // 3. Delete Batch
    const batchesDeleted = await Batch.deleteMany({
      code: '2022'
    });
    console.log(`Deleted test batches: ${batchesDeleted.deletedCount}`);

    // 4. Delete Audit Logs related to test module
    const auditLogsDeleted = await AuditLog.deleteMany({
      action: { $in: ['UPDATE_STUDENT_STATUS', 'PROMOTE_BATCH', 'LMS_SYNC', 'BULK_UPLOAD_STUDENTS', 'CREATE_CURRICULUM_MAP'] }
    });
    console.log(`Deleted test audit logs: ${auditLogsDeleted.deletedCount}`);

    // 5. Delete Mock Notifications
    const notifsDeleted = await Notification.deleteMany({
      title: { $regex: /At-Risk/i },
      message: { $regex: /BSCS-22-0002|Bob/i }
    });
    console.log(`Deleted test notifications: ${notifsDeleted.deletedCount}`);

    console.log('Cleanup complete.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
  }
};

cleanTestRecords();
