import mongoose from 'mongoose';
import Student from './models/student.js';

const run = async () => {
  const localUri = 'mongodb://localhost:27017/batchminder';
  try {
    console.log('Connecting to local database...');
    await mongoose.connect(localUri);
    
    console.log('Finding students in local DB...');
    const localStudents = await Student.find({}, 'rollNumber name');
    console.log('Local students:', localStudents.map(s => `${s.rollNumber} (${s.name})`));
    
    console.log('Deleting test student records from local DB...');
    const result = await Student.deleteMany({
      rollNumber: { $in: ['BSCS-22-0001', 'BSCS-22-0002'] }
    });
    
    console.log(`Successfully deleted ${result.deletedCount} student records from local DB.`);
  } catch (err) {
    console.log('Could not connect to local DB or error occurred:', err.message);
  } finally {
    await mongoose.disconnect();
  }
};

run();
