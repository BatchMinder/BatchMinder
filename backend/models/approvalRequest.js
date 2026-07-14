import mongoose from 'mongoose';

const approvalRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Please provide student ID'],
  },
  advisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide advisor ID'],
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Please provide department ID'],
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: [true, 'Please provide batch ID'],
  },
  courseCode: {
    type: String,
    required: [true, 'Please provide course code'],
    uppercase: true,
    trim: true,
  },
  courseTitle: {
    type: String,
    required: [true, 'Please provide course title'],
    trim: true,
  },
  creditHours: {
    type: Number,
    required: [true, 'Please provide credit hours'],
    min: 1,
    max: 6,
  },
  requestType: {
    type: String,
    enum: ['add', 'drop', 'withdrawal', 'special_permission'],
    required: [true, 'Please provide request type'],
  },
  justification: {
    type: String,
    required: [
      function() {
        return this.requestType === 'special_permission';
      },
      'Justification is required for special permission requests'
    ],
  },
  status: {
    type: String,
    enum: ['pending', 'advisor_approved', 'advisor_rejected', 'approved', 'rejected', 'special_granted', 'returned_for_edit'],
    default: 'pending',
  },
  currentApproverRole: {
    type: String,
    enum: ['advisor', 'hod', 'none', 'student'],
    default: 'advisor',
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please specify who submitted this request'],
  },
  advisorDecision: {
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
    remarks: { type: String },
  },
  hodDecision: {
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
    remarks: { type: String },
  },
  // Flattened fields for easy frontend access
  advisorRemarks: { type: String, default: '' },
  hodRemarks: { type: String, default: '' },
  prereqCheck: { type: String, default: '' },
  duplicateWarning: { type: String, default: '' }
}, {
  timestamps: true,
});

const ApprovalRequest = mongoose.model('ApprovalRequest', approvalRequestSchema);
export default ApprovalRequest;
