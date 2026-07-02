import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // can be null for anonymous actions (failed logins)
  },
  userEmail: {
    type: String,
    required: false,
  },
  action: {
    type: String,
    required: [true, 'Please provide an action name'],
  },
  description: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
