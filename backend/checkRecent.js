import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
  .then(async () => {
    const Upload = mongoose.connection.collection('uploads');
    const latestUploads = await Upload.find({}).sort({ createdAt: -1 }).limit(10).toArray();

    console.log("--- ALL RECENT UPLOADS (last 10) ---");
    for (const u of latestUploads) {
      console.log(`\n[${u.createdAt?.toISOString()}] ${u.fileName} | status: ${u.status} | valid: ${u.validRecords} | errors: ${u.errorCount} | _id: ${u._id}`);
    }

    const Student = mongoose.connection.collection('students');
    const latestStudents = await Student.find({}).sort({ createdAt: -1 }).limit(10).toArray();
    console.log("\n--- LATEST STUDENTS (last 10) ---");
    for (const s of latestStudents) {
      console.log(`[${s.createdAt?.toISOString()}] ${s.name} | roll: ${s.rollNumber}`);
    }

    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });
