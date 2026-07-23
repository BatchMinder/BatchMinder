import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const batches = await mongoose.connection.collection('batches').find({}).toArray();
    console.log("=== BATCHES IN DB ===");
    for (const b of batches) {
      console.log(`code: ${b.code} | dept: ${b.dept} | _id: ${b._id}`);
    }
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });
