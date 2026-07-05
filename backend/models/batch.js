import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide batch code'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  dept: {
    type: String,
    required: [true, 'Please specify department'],
    trim: true,
  },
  advisor: {
    type: String,
    default: 'Unassigned',
    trim: true,
  },
  status: {
    type: String,
    enum: ['Allocated', 'Pending', 'Unassigned'],
    default: 'Unassigned',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Batch = mongoose.model('Batch', batchSchema);
export default Batch;
