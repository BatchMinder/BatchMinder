import Notification from '../models/notification.js';
import { scopeQueryToRole } from '../middleware/scopeMiddleware.js';
import { logAudit } from '../utils/logger.js';

// GET: list all notifications with role scope filtering applied
export const getAllNotifications = async (req, res, next) => {
  try {
    const scopeFilter = await scopeQueryToRole(req.user);
    
    let filter = {};
    if (req.user.role !== 'dean') {
      filter = {
        $or: [
          scopeFilter,
          { departmentId: null, batchId: null, recipientId: null }
        ]
      };
    }

    const { isRead, page = 1, limit = 50 } = req.query;

    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Notification.countDocuments(filter);

    const results = notifications.map(n => ({
      id: n._id,
      title: n.message,
      message: n.message,
      type: n.type,
      status: n.isRead ? 'Read' : 'Unread',
      isRead: n.isRead,
      time: n.createdAt,
      createdAt: n.createdAt,
      target: n.recipientRole || 'All Users',
      deepLinkUrl: n.deepLinkUrl || null
    }));

    res.status(200).json({
      status: 'success',
      results: results.length,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: results
    });
  } catch (err) {
    next(err);
  }
};

// POST: create a notification (Broadcast or specific targeted alert)
export const createNotification = async (req, res, next) => {
  try {
    const { title, message, type, recipientRole, departmentId, batchId, recipientId, deepLinkUrl } = req.body;

    const finalMessage = message || title || 'New Alert';

    const newNotif = await Notification.create({
      recipientId,
      recipientRole,
      type: type || 'info',
      message: finalMessage,
      departmentId,
      batchId,
      isRead: false,
      deepLinkUrl
    });

    // Log action to Audit Log
    await logAudit({
      actorId: req.user ? req.user._id : null,
      actorRole: req.user ? req.user.role : null,
      action: 'NOTIFICATION_CREATE',
      targetType: 'Notification',
      targetId: newNotif._id.toString(),
      departmentId,
      batchId
    });

    res.status(201).json({
      status: 'success',
      data: {
        id: newNotif._id,
        title: newNotif.message,
        type: newNotif.type,
        status: newNotif.isRead ? 'Read' : 'Unread',
        time: newNotif.createdAt,
        target: newNotif.recipientRole || 'All Users'
      }
    });
  } catch (err) {
    next(err);
  }
};

// PATCH: mark selected notifications as read (Bulk)
export const markBulkAsRead = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide an array of notification ids'
      });
    }

    await Notification.updateMany({ _id: { $in: ids } }, { isRead: true });

    res.status(200).json({
      status: 'success',
      message: 'Notifications marked as read'
    });
  } catch (err) {
    next(err);
  }
};

// PATCH: mark single notification as read
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const n = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    if (!n) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        id: n._id,
        title: n.message,
        message: n.message,
        type: n.type,
        status: n.isRead ? 'Read' : 'Unread',
        isRead: n.isRead,
        time: n.createdAt,
        createdAt: n.createdAt,
        target: n.recipientRole || 'All Users',
        deepLinkUrl: n.deepLinkUrl || null
      }
    });
  } catch (err) {
    next(err);
  }
};

// PATCH: mark all accessible notifications as read
export const markAllAsRead = async (req, res, next) => {
  try {
    const scopeFilter = await scopeQueryToRole(req.user);
    
    let filter = {};
    if (req.user.role !== 'dean') {
      filter = {
        $or: [
          scopeFilter,
          { departmentId: null, batchId: null, recipientId: null }
        ]
      };
    }

    await Notification.updateMany({ ...filter, isRead: false }, { isRead: true });

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read successfully'
    });
  } catch (err) {
    next(err);
  }
};
