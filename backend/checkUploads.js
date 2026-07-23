import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
  .then(async () => {
    const Upload = mongoose.connection.collection('uploads');
    const latestUploads = await Upload.find({}).sort({ createdAt: -1 }).limit(5).toArray();
    console.log(JSON.stringify(latestUploads, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
