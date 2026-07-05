import Student from '../models/student.js';
import User from '../models/user.js';
import Batch from '../models/batch.js';
import Department from '../models/department.js';
import AuditLog from '../models/auditLog.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Student Stats
    const totalStudents = await Student.countDocuments({});
    const warningStudents = await Student.countDocuments({ status: 'warning' });
    const criticalStudents = await Student.countDocuments({ status: 'critical' });
    const goodStandingStudents = await Student.countDocuments({ status: 'good_standing' });

    // 2. User Stats
    const totalUsers = await User.countDocuments({});
    const activeUsers = await User.countDocuments({ status: 'Active' });
    
    // 3. Batch Stats
    const totalBatches = await Batch.countDocuments({});
    const allocatedBatches = await Batch.countDocuments({ status: 'Allocated' });

    // 4. Department Enrollment aggregation
    const studentAggregation = await Student.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    const departments = await Department.find({});
    const deptStats = departments.map(d => {
      const aggItem = studentAggregation.find(a => a._id === d.name);
      const count = aggItem ? aggItem.count : 0;
      const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
      return {
        name: d.name,
        students: count,
        pct,
        color: d.color,
        stats: `${d.code} Department • Est. ${d.established}`
      };
    });

    // If no departments exist in database, provide fallback matching seed
    const finalDeptStats = deptStats.length > 0 ? deptStats : [
      { name: 'Computer Science', students: 0, pct: 0, color: '#3B82F6', stats: 'CS Department' },
      { name: 'Software Engineering', students: 0, pct: 0, color: '#7C3AED', stats: 'SE Department' },
      { name: 'Electrical Engineering', students: 0, pct: 0, color: '#EF4444', stats: 'EE Department' }
    ];

    // 5. Recent System Activity logs (Audit Logs)
    const auditLogs = await AuditLog.find({})
      .sort({ timestamp: -1 })
      .limit(6);

    // Map logs to format expected by UI
    const mappedLogs = [];
    for (const log of auditLogs) {
      let performerName = 'System';
      if (log.performedBy) {
        const u = await User.findById(log.performedBy);
        if (u) performerName = u.name;
      }
      mappedLogs.push({
        id: log._id,
        action: log.action,
        details: log.details,
        time: log.timestamp,
        user: performerName
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        students: {
          total: totalStudents,
          goodStanding: goodStandingStandingCounts(goodStandingStudents),
          warning: warningStudents,
          critical: criticalStudents
        },
        users: {
          total: totalUsers,
          active: activeUsers
        },
        batches: {
          total: totalBatches,
          allocated: allocatedBatches
        },
        departments: finalDeptStats,
        activityLogs: mappedLogs
      }
    });
  } catch (err) {
    next(err);
  }
};

// Helper for typo safety in response variables
const goodStandingStandingCounts = (val) => {
  return val;
};
