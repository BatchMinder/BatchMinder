import AuditLog from '../models/auditLog.js';
import Notification from '../models/notification.js';
import User from '../models/user.js';
import { sendEmail } from './email.js';

// Maps notification `type` values to a subject prefix + accent color for the email template.
// Falls back to a neutral style for any type not listed here (e.g. workflow 'info'/'warning').
const NOTIFICATION_EMAIL_STYLE = {
  CGPA_CRITICAL: { subjectPrefix: 'CRITICAL ALERT', color: '#EF4444' },
  CGPA_WARNING: { subjectPrefix: 'Warning', color: '#F59E0B' },
  warning: { subjectPrefix: 'Action Needed', color: '#F59E0B' },
  info: { subjectPrefix: 'BatchMinder Update', color: '#2563EB' }
};

// Builds and sends the email half of a notification (FE-15 / FR-4.7 / FR-3.5:
// "automated email and in-app notifications"). Failure here never blocks the
// in-app notification -- it's best-effort, same as the rest of the notification path.
async function sendNotificationEmail({ recipientId, type, message, deepLinkUrl }) {
  try {
    const recipient = await User.findById(recipientId).select('name email');
    if (!recipient || !recipient.email) return;

    const style = NOTIFICATION_EMAIL_STYLE[type] || NOTIFICATION_EMAIL_STYLE.info;
    const linkUrl = deepLinkUrl
      ? (process.env.FRONTEND_URL || 'http://localhost:5173') + deepLinkUrl
      : null;

    const html = '<div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #E2E8F0; border-radius: 12px;">'
      + '<h2 style="color: ' + style.color + '; margin-top: 0;">' + style.subjectPrefix + '</h2>'
      + '<p style="color: #334155; font-size: 16px;">' + message + '</p>'
      + (linkUrl ? '<a href="' + linkUrl + '" style="display: inline-block; background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">View in BatchMinder</a>' : '')
      + '</div>';

    await sendEmail({
      to: recipient.email,
      subject: style.subjectPrefix + ': BatchMinder Notification',
      html
    });
  } catch (err) {
    console.error('[Notification Logger] Email dispatch failed:', err);
  }
}

export const logAudit = async ({
  actorId,
  actorRole,
  action,
  targetType,
  targetId,
  departmentId,
  batchId,
  metadata = {},
  ipAddress = null
}) => {
  try {
    // Function params keep their original names (actorId/action) so every existing
    // logAudit({...}) call site across the controllers is unaffected -- only the
    // persisted document uses the renamed schema fields (userID/actionType).
    return await AuditLog.create({
      userID: actorId,
      actorRole,
      actionType: action,
      targetType,
      targetId,
      departmentId,
      batchId,
      description: metadata.description || metadata.desc || '',
      metadata,
      ipAddress
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

    // Fire-and-forget email dispatch -- don't let a slow/failed email delay the response
    // or roll back the in-app notification that was already written above.
    sendNotificationEmail({ recipientId, type, message, deepLinkUrl });

    return notif;
  } catch (err) {
    console.error('[Notification Logger] Creation failed:', err);
  }
};
