import mongoose from 'mongoose';

const courseEnrollmentSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
  },
  courseTitle: {
    type: String,
    required: true,
  },
  creditHours: {
    type: Number,
    required: true,
  },
  grade: {
    type: String,
    default: 'IP', // IP = In Progress, or A, B+, C, F, etc.
  },
  status: {
    type: String,
    enum: ['enrolled', 'completed', 'failed'],
    default: 'enrolled',
  },
  attendance: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
  }
});

const studentSchema = new mongoose.Schema({
  rollNumber: {
    type: String,
    required: [true, 'Please provide a student roll number'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide student name'],
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  batch: {
    type: String,
    required: [true, 'Please specify student batch (e.g. 2022)'],
    trim: true,
  },
  department: {
    type: String,
    required: [true, 'Please specify department'],
    trim: true,
  },
  currentSemester: {
    type: Number,
    default: 1,
  },
  cgpa: {
    type: Number,
    default: 0.0,
    min: 0.0,
    max: 4.0,
  },
  status: {
    type: String,
    enum: ['good_standing', 'warning', 'critical'],
    default: 'good_standing',
  },
  courses: [courseEnrollmentSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Student = mongoose.model('Student', studentSchema);
export default Student;
