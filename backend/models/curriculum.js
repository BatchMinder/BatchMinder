import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  creditHours: {
    type: Number,
    required: true,
    min: 1,
    max: 6,
  },
  prerequisites: [String], // Array of course codes
});

const curriculumSchema = new mongoose.Schema({
  department: {
    type: String,
    required: [true, 'Please specify department'],
    trim: true,
  },
  batch: {
    type: String,
    required: [true, 'Please specify batch'],
    trim: true,
  },
  semester: {
    type: Number,
    required: [true, 'Please specify semester'],
    min: 1,
    max: 12,
  },
  courses: [courseSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Composite unique index ensures only one curriculum map exists per department/batch/semester
curriculumSchema.index({ department: 1, batch: 1, semester: 1 }, { unique: true });

const Curriculum = mongoose.model('Curriculum', curriculumSchema);
export default Curriculum;
