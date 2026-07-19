import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './utils/db.js';
import Student from './models/student.js';

dotenv.config();

async function run() {
  await connectDB();
  
  const students = await Student.find({}).populate('batchId', 'code');
  console.log(`Total students in DB: ${students.length}`);
  
  // Group by batch and current semester
  const summary = {};
  students.forEach(s => {
    const batchCode = s.batchId?.code || 'No Batch';
    const key = `${batchCode} (Sem ${s.currentSemester})`;
    if (!summary[key]) summary[key] = [];
    summary[key].push(s);
  });

  for (const [key, list] of Object.entries(summary)) {
    console.log(`Group ${key}: ${list.length} students`);
    const sample = list[0];
    console.log(`  Sample Student: ${sample.name} (${sample.rollNumber})`);
    console.log(`  Courses count: ${sample.courses.length}`);
    if (sample.courses.length > 0) {
      console.log(`  Sample courses in Sem 1:`, sample.courses.filter(c => c.semester === 1).map(c => c.courseCode));
      if (sample.currentSemester >= 5) {
        console.log(`  Sample courses in Sem 5:`, sample.courses.filter(c => c.semester === 5).map(c => c.courseCode));
      }
    }
  }

  process.exit(0);
}

run().catch(console.error);
