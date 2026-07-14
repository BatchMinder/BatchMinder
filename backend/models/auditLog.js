import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  actorRole: {
    type: String,
    required: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  userEmail: {
    type: String,
    required: false
  },
  action: {
    type: String,
    required: [true, 'Please provide an action name']
  },
  description: {
    type: String,
    required: false
  },
  targetType: {
    type: String,
    required: false
  },
  targetId: {
    type: String,
    required: false
  },
  departmentId: {
    type: String,
    required: false
  },
  batchId: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
