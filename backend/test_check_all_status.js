import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/batchminder';
    await mongoose.connect(mongoUri);

    const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
    const Migration = mongoose.model('Migration', new mongoose.Schema({}, { strict: false }));

    const migrations = await Migration.find({});
    console.log("Current DB Migrations Status:");
    for (const m of migrations) {
      const stu = await Student.findById(m.studentId);
      console.log(`- ID: ${stu?.rollNumber || m.studentId || 'N/A'}, Name: ${stu?.name || 'N/A'}, Status: ${m.status}, Transferred Courses Count: ${m.transferredCourses?.length}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}
run();
