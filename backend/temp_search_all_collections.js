import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    for (const colInfo of collections) {
      const colName = colInfo.name;
      const col = db.collection(colName);
      
      const found = await col.find({
        $or: [
          { name: { $regex: /Alice|Bob/i } },
          { rollNumber: { $regex: /BSCS-22-0001|BSCS-22-0002/i } },
          { roll: { $regex: /BSCS-22-0001|BSCS-22-0002/i } }
        ]
      }).toArray();
      
      if (found.length > 0) {
        console.log(`Found in collection "${colName}":`, found.map(f => `${f.rollNumber || f.roll || f._id} (${f.name})`));
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
