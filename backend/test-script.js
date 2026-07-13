import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Batch = mongoose.model('Batch', new mongoose.Schema({}, { strict: false }));
    const Timetable = mongoose.model('Timetable', new mongoose.Schema({}, { strict: false }));

    const fatima = await User.findOne({ email: 'advisor.cs@stmu.edu.pk' });
    console.log('Fatima assignedBatchIds:', fatima ? fatima.assignedBatchIds : 'Not found');
    
    if (fatima && fatima.assignedBatchIds) {
      const batches = await Batch.find({ _id: { $in: fatima.assignedBatchIds } });
      console.log('Batch Codes for Fatima:', batches.map(b => b.batchCode));
    }

    const t = await Timetable.find({});
    console.log('Timetable Batches existing in DB:', [...new Set(t.map(x => x.batch))]);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
