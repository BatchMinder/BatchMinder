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
  // Multiple Curriculum documents CAN exist per department now — one per
  // version. At any time, exactly one of them has status 'active' (the
  // current version new batches get pinned to); older ones are 'archived'
  // but stay in the DB untouched so batches pinned to them keep working.
  // Admins are scoped to their own departmentId(s) via scopeToUserDepartments,
  // so an AI admin can only touch AI's curriculum documents, etc.
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Please specify department'],
  },
  department: {
    type: String,
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

curriculumSchema.index({ departmentId: 1, status: 1 });

const Curriculum = mongoose.model('Curriculum', curriculumSchema);
export default Curriculum;
