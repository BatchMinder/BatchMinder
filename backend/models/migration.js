import mongoose from 'mongoose';

const transferredCourseSchema = new mongoose.Schema({
  courseName: {
    type: String,
    required: true,
    trim: true,
  },
  mappedCourseName: {
    type: String,
    default: '',
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
  grade: {
    type: String,
    trim: true,
  },
  semester: {
    type: Number,
    default: 1,
  }
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
  fromProgram: {
    type: String,
    default: '',
    trim: true,
  },
  toProgram: {
    type: String,
    default: '',
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  transferredCourses: [transferredCourseSchema],
  transcriptUrl: {
    type: String,
    default: '',
    trim: true,
  },
  transcriptCloudinaryId: {
    type: String,
    default: '',
    trim: true,
  },
  transcriptOriginalName: {
    type: String,
    default: '',
    trim: true,
  },
  curriculumComparison: {
    fromRequiredCredits: { type: Number, default: 0 },
    toRequiredCredits: { type: Number, default: 0 },
    fromCompletedCredits: { type: Number, default: 0 },
    toCompletedCredits: { type: Number, default: 0 },
    fromRemainingCredits: { type: Number, default: 0 },
    toRemainingCredits: { type: Number, default: 0 },
    fromDurationSemesters: { type: Number, default: 8 },
    toDurationSemesters: { type: Number, default: 8 },
    expectedCompletion: { type: String, default: '' },
  },
  missingCourses: [
    {
      courseCode: { type: String, default: '' },
      courseTitle: { type: String, default: '' },
      creditHours: { type: Number, default: 0 },
    }
  ],
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
