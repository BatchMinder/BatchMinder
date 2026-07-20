import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  creditHours: {
    type: Number,
    required: true,
    min: 1,
    max: 6,
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  prerequisiteCourseIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Curriculum.courses', // logical ref — validated in controller
  }],
  courseType: {
    type: String,
    enum: ['CORE', 'ELECTIVE', 'LAB', 'GENERAL'],
    default: 'CORE',
  },
});

const curriculumSchema = new mongoose.Schema({
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Please specify department'],
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: [true, 'Please specify batch'],
  },
  department: {
    type: String,
  },
  batch: {
    type: String,
  },
  semester: {
    type: Number,
  },
  version: {
    type: String,
    required: [true, 'Please specify curriculum version'],
    trim: true,
    default: '1.0',
  },
  totalRequiredCredits: {
    type: Number,
    default: 130,
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
  },
  isHecStandard: {
    type: Boolean,
    default: false,
    index: true,
  },
  courses: [courseSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// One active curriculum per department+batch
curriculumSchema.index({ departmentId: 1, batchId: 1, version: 1 }, { unique: true });

const Curriculum = mongoose.model('Curriculum', curriculumSchema);
export default Curriculum;
