import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide department code'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide department name'],
    trim: true,
  },
  // ObjectId ref to User (HOD) — nullable, assigned after department creation
  hodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Legacy string kept for Module 1 backward compat
  hod: {
    type: String,
    default: 'Unassigned',
    trim: true,
  },
  established: {
    type: Number,
    required: [true, 'Please specify established year'],
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  color: {
    type: String,
    default: '#3B82F6',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Department = mongoose.model('Department', departmentSchema);
export default Department;
