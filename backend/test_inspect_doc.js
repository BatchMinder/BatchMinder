import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/batchminder';
    await mongoose.connect(mongoUri);

    const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
    const Migration = mongoose.model('Migration', new mongoose.Schema({}, { strict: false }));

    const stu = await Student.findOne({ rollNumber: 'MIG-789769' });
    const mig = await Migration.findOne({ studentId: stu?._id });

    console.log('Student:', stu?._id, stu?.name, 'Courses length:', stu?.courses?.length);
    console.log('Migration:', mig?._id, 'Status:', mig?.status, 'Transferred Courses length:', mig?.transferredCourses?.length);

  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}
run();
