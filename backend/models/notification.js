import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  recipientRole: {
    type: String,
    required: false
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'critical', 'CGPA_WARNING', 'CGPA_CRITICAL', 'APPROVAL_PENDING'],
    default: 'info'
  },
  message: {
    type: String,
    required: [true, 'Please provide notification message'],
    trim: true
  },
  departmentId: {
    type: String,
    required: false
  },
  batchId: {
    type: String,
    required: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  sentDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  deepLinkUrl: {
    type: String,
    required: false
  }
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;