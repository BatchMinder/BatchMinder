import dotenv from 'dotenv';
import connectDB from './utils/db.js';
import Student from './models/student.js';
import Curriculum from './models/curriculum.js';
import Batch from './models/batch.js';

dotenv.config();

async function run() {
  await connectDB();
  
  const student = await Student.findOne({ email: 'hina.fatima@stmu.edu.pk' });
  if (!student) {
    console.log('Hina Fatima not found!');
    process.exit(1);
  }
  
  const batchId = student.batchId;
  console.log(`Student: ${student.name}, Batch ID: ${batchId}`);

  const curr = await Curriculum.findOne({ batchId });
  if (curr) {
    console.log(`Curriculum: ${curr.version}, courses count: ${curr.courses.length}`);
    curr.courses.forEach((c, idx) => {
      if (idx < 5) {
        console.log(`  * [${c.code}] ${c.title} (Sem ${c.semester}, credits: ${c.creditHours})`);
      }
    });
  } else {
    console.log('Curriculum not found for batch!');
  }

  process.exit(0);
}

run().catch(console.error);
