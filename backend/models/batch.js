import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide batch code'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Please specify department'],
  },
  startYear: {
    type: Number,
    required: [true, 'Please specify start year'],
  },
  curriculumVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Curriculum',
    default: null,
  },
  advisor: {
    type: String,
    default: 'Unassigned',
    trim: true,
  },
  advisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
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
