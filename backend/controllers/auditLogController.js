import AuditLog from '../models/auditLog.js';
import { scopeQueryToRole } from '../middleware/scopeMiddleware.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const scope = scopeQueryToRole(req.user);
    if (scope._id === null) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: { logs: [] }
      });
    }

    const { action, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = { ...scope };

    if (action) {
      filter.action = action;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day to include the entire day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = endOfDay;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const logs = await AuditLog.find(filter)
      .populate('actorId', 'name email role')
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await AuditLog.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: logs.length,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: {
        logs
      }
    });
  } catch (err) {
    next(err);
  }
};
