import mongoose from 'mongoose';
import dns from 'dns';

// Force Node to use Google DNS to bypass local ISP SRV resolution issues
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

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

    // Self-healing alignment
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