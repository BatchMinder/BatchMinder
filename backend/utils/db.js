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

    // Self-healing alignment: ensure User.assignedBatchIds reflects Batch.advisorId settings
    try {
      const Batch = mongoose.model('Batch');
      const User = mongoose.model('User');
      const batches = await Batch.find({ advisorId: { $ne: null } });
      
      for (const batch of batches) {
        await User.findByIdAndUpdate(batch.advisorId, {
          $addToSet: { assignedBatchIds: batch._id }
        });
      }
      console.log('Self-healing: advisor batch assignments aligned successfully.');
    } catch (err) {
      console.error('Error running advisor self-healing alignment:', err);
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

export default connectDB;
