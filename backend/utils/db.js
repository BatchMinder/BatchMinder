import mongoose from 'mongoose';

export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/batchminder';
  try {
    await mongoose.connect(mongoUri);
    console.log('Successfully connected to MongoDB.');
    
    // Sync indices for the User model
    try {
      await mongoose.model('User').syncIndexes();
      console.log('User indices synchronized successfully.');
    } catch (err) {
      console.error('Error syncing User indices:', err);
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

export default connectDB;
