import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/batchminder';
    await mongoose.connect(mongoUri);

    const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
    const Migration = mongoose.model('Migration', new mongoose.Schema({}, { strict: false }));

    const stu = await Student.findOne({ rollNumber: 'MIG-975061' });
    const mig = await Migration.findOne({ studentId: stu?._id });

    if (mig) {
      mig.status = 'pending';
      await mig.save();
      console.log('Migration status reset to pending.');
    }

    if (stu) {
      stu.courses = [];
      stu.cgpa = 0;
      await stu.save();
      console.log('Student courses and CGPA cleared.');
    }

  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}
run();
