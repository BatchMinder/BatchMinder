import mongoose from 'mongoose';

const degreeProgressSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  completedCredits: {
    type: Number,
    required: true,
    default: 0
  },
  remainingCredits: {
    type: Number,
    required: true,
    default: 130
  },
  completionPercentage: {
    type: Number,
    required: true,
    default: 0.0
  },
  backlog: {
    type: [String],
    default: []
  },
  missingCoreCourses: {
    type: [String],
    default: []
  },
  missingPrerequisites: {
    type: [String],
    default: []
  },
  creditLoss: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const DegreeProgress = mongoose.model('DegreeProgress', degreeProgressSchema);
export default DegreeProgress;
