import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);

    const db = mongoose.connection.db;

    // Direct collection update
    const migResult = await db.collection('migrations').updateMany(
      {},
      { $set: { status: 'pending', transferredCourses: [] } }
    );
    console.log(`Migrations updated: matchCount=${migResult.matchedCount}, modifiedCount=${migResult.modifiedCount}`);

    const stuResult = await db.collection('students').updateMany(
      { rollNumber: { $regex: /^MIG-/ } },
      { $set: { courses: [], cgpa: 0.0 } }
    );
    console.log(`Students updated: matchCount=${stuResult.matchedCount}, modifiedCount=${stuResult.modifiedCount}`);

  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}
run();
