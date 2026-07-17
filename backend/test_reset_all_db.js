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
    for (const mig of migrations) {
      mig.status = 'pending';
      
      // Wipe the incorrectly formatted transferred courses so they can be re-imported
      mig.transferredCourses = [];
      await mig.save();
    }
    console.log(`Reset ${migrations.length} migrations to pending.`);

    const students = await Student.find({ rollNumber: { $regex: /^MIG-/ } });
    for (const stu of students) {
      stu.courses = [];
      stu.cgpa = 0;
      await stu.save();
    }
    console.log(`Cleared courses and CGPA for ${students.length} migration students.`);

  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}
run();
