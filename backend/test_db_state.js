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

    console.log('Migration Status:', mig?.status);
    console.log('Transferred Courses Equivalency Statuses:');
    mig?.transferredCourses?.forEach(c => {
      console.log(`- ${c.courseName}: ${c.equivalencyStatus}`);
    });
    
    console.log('\nStudent Profile Courses:');
    stu?.courses?.forEach(c => {
      console.log(`- ${c.courseCode} (${c.creditHours} CR): ${c.grade} / ${c.status}`);
    });

  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}
run();
