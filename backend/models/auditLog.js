import mongoose from 'mongoose';

// Field names below match the Dev Blueprint's documented AuditLogs collection
// (Section 4.2: logID, userID, actionType, timestamp, ipAddress) -- previously
// this schema used actorId/action, which drifted from that spec. logID isn't a
// literal field here because Mongoose's auto-generated _id already serves that role.
const auditLogSchema = new mongoose.Schema({
  userID: {
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
  actionType: {
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
