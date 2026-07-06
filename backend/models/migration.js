import mongoose from 'mongoose';

const transferredCourseSchema = new mongoose.Schema({
  courseName: {
    type: String,
    required: true,
    trim: true,
  },
  credits: {
    type: Number,
    required: true,
    min: 0,
  },
  equivalencyStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
});

const migrationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Please specify student'],
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Please specify department'],
  },
  sourceInstitution: {
    type: String,
    required: [true, 'Please specify source institution'],
    trim: true,
  },
  transferredCourses: [transferredCourseSchema],
  decidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  decidedAt: {
    type: Date,
    default: null,
  },
  remarks: {
    type: String,
    trim: true,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Migration = mongoose.model('Migration', migrationSchema);
export default Migration;
