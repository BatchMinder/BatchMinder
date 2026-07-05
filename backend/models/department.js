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
