import AuditLog from '../models/auditLog.js';
import Notification from '../models/notification.js';

export const logAudit = async ({
  actorId,
  actorRole,
  action,
  targetType,
  targetId,
  departmentId,
  batchId,
  metadata = {}
}) => {
  try {
    return await AuditLog.create({
      actorId,
      actorRole,
      action,
      targetType,
      targetId,
      departmentId,
      batchId,
      metadata
    });
  } catch (err) {
    console.error('[Audit Logger] Write failed:', err);
  }
};

export const logNotification = async ({
  recipientId,
  recipientRole,
  type = 'info',
  message,
  departmentId,
  batchId,
  deepLinkUrl
}) => {
  try {
    const notif = await Notification.create({
      recipientId,
      recipientRole,
      type,
      message,
      departmentId,
      batchId,
      isRead: false,
      deepLinkUrl
    });

    console.log(`[FCM Notification Mock Dispatch] Sent Notification ID: ${notif._id}`);
    return notif;
  } catch (err) {
    console.error('[Notification Logger] Creation failed:', err);
  }
};
