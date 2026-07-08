import Student from '../models/student.js';
import Batch from '../models/batch.js';
import Department from '../models/department.js';
import User from '../models/user.js';
import AuditLog from '../models/auditLog.js';
import { scopeToUserDepartments, scopeQueryToRole } from '../middleware/scopeMiddleware.js';

import Migration from '../models/migration.js';

// GET /api/dashboard/stats
// Returns stats compatible with BOTH SuperAdmin dashboard and new Admin dashboard
export const getDashboardStats = async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin';

    // --- Student counts (handle both old 'department' string and new 'departmentId' ObjectId) ---
    let studentQuery = {};
    if (!isSuperAdmin) {
      // Advisors are scoped by assignedBatchIds; other roles by departmentIds
      const scope = req.user.role === 'advisor'
        ? scopeQueryToRole(req.user)
        : scopeToUserDepartments(req);
      if (scope._id === null) {
        return res.status(200).json({
          status: 'success',
          data: {
            totalStudents: 0, activeStudents: 0, atRiskStudents: 0,
            studentsByStatus: { good: 0, warning: 0, critical: 0 },
            totalBatches: 0, departments: [], users: { total: 0, active: 0 },
            students: { total: 0, warning: 0, critical: 0 },
            batches: { total: 0, allocated: 0 },
            pendingMigrations: 0
          }
        });
      }
      studentQuery = scope;
    }

    const [
      allStudents,
      totalBatches,
      allocatedBatches,
      totalUsers,
      activeUsers,
      departments,
      recentLogs,
      pendingMigrations,
    ] = await Promise.all([
      Student.find(studentQuery).lean(),
      Batch.countDocuments(isSuperAdmin ? {} : scopeToUserDepartments(req)),
      Batch.countDocuments({ status: 'Allocated', ...(isSuperAdmin ? {} : scopeToUserDepartments(req)) }),
      isSuperAdmin ? User.countDocuments({}) : Promise.resolve(0),
      isSuperAdmin ? User.countDocuments({ status: 'Active' }) : Promise.resolve(0),
      Department.find(isSuperAdmin ? {} : { _id: { $in: req.user.departmentIds || [] } }).lean(),
      isSuperAdmin ? AuditLog.find({}).sort({ timestamp: -1 }).limit(6).lean() : Promise.resolve([]),
      Migration.countDocuments({ decidedAt: null })
    ]);

    const totalStudents = allStudents.length;
    const activeStudents = allStudents.filter(s => s.status === 'active').length;
    const warningStudents = allStudents.filter(s => s.cgpaStatus === 'warning' || s.status === 'warning').length;
    const criticalStudents = allStudents.filter(s => s.cgpaStatus === 'critical' || s.status === 'critical').length;
    const goodStudents = allStudents.filter(s => s.cgpaStatus === 'good' || s.status === 'good_standing').length;
    const atRiskStudents = warningStudents + criticalStudents;

    // Build department stats for SuperAdmin dashboard
    const deptStats = await Promise.all(departments.map(async (d) => {
      const studentCount = await Student.countDocuments({
        $or: [{ departmentId: d._id }, { department: d.name }]
      });
      const pct = totalStudents > 0 ? Math.round((studentCount / totalStudents) * 100) : 0;
      return {
        name: d.name,
        students: studentCount,
        pct,
        color: d.color || '#3B82F6',
        stats: `${d.code} Department${d.established ? ` • Est. ${d.established}` : ''}`,
        code: d.code,
      };
    }));

    res.status(200).json({
      status: 'success',
      data: {
        // New shape for Admin dashboard
        totalStudents,
        activeStudents,
        atRiskStudents,
        studentsByStatus: { good: goodStudents, warning: warningStudents, critical: criticalStudents },
        totalBatches,
        // Legacy shape for SuperAdmin dashboard
        students: { total: totalStudents, goodStanding: goodStudents, warning: warningStudents, critical: criticalStudents },
        users: { total: totalUsers, active: activeUsers },
        batches: { total: totalBatches, allocated: allocatedBatches },
        departments: deptStats,
        pendingMigrations,
        activityLogs: recentLogs.map(log => ({
          id: log._id,
          action: log.action,
          details: log.metadata?.description || log.description || '',
          time: log.timestamp,
          user: log.userEmail || log.actorId || 'System',
        })),
      }
    });
  } catch (err) {
    console.error('[dashboardController.getDashboardStats]', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// GET /api/dashboard/cgpa-distribution
export const getCgpaDistribution = async (req, res) => {
  try {
    let scope;
    if (req.user.role === 'super_admin') {
      scope = {};
    } else if (req.user.role === 'advisor') {
      scope = scopeQueryToRole(req.user);
    } else {
      scope = scopeToUserDepartments(req);
    }
    if (scope._id === null) {
      return res.status(200).json({ status: 'success', data: { labels: [], counts: [] } });
    }

    const distribution = await Student.aggregate([
      { $match: scope },
      { $group: { _id: '$cgpaStatus', count: { $sum: 1 } } },
    ]);

    const statusOrder = ['good', 'warning', 'critical'];
    const counts = statusOrder.map(s => {
      const found = distribution.find(d => d._id === s);
      return found ? found.count : 0;
    });

    res.status(200).json({ status: 'success', data: { labels: statusOrder, counts } });
  } catch (err) {
    console.error('[dashboardController.getCgpaDistribution]', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// GET /api/dashboard/students-by-batch
export const getStudentsByBatch = async (req, res) => {
  try {
    let scope;
    if (req.user.role === 'super_admin') {
      scope = {};
    } else if (req.user.role === 'advisor') {
      scope = scopeQueryToRole(req.user);
    } else {
      scope = scopeToUserDepartments(req);
    }
    if (scope._id === null) {
      return res.status(200).json({ status: 'success', data: [] });
    }

    const students = await Student.find(scope).populate('batchId', 'code').lean();

    const batchMap = {};
    for (const s of students) {
      const key = s.batchId ? s.batchId._id.toString() : (s.batch || 'unknown');
      const code = s.batchId ? s.batchId.code : (s.batch || 'Unknown');
      if (!batchMap[key]) {
        batchMap[key] = { batchId: key, batchCode: code, total: 0, active: 0, atRisk: 0 };
      }
      batchMap[key].total++;
      if (s.status === 'active') batchMap[key].active++;
      if (s.cgpaStatus === 'warning' || s.cgpaStatus === 'critical') batchMap[key].atRisk++;
    }

    const data = Object.values(batchMap).sort((a, b) => b.total - a.total);
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    console.error('[dashboardController.getStudentsByBatch]', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// GET /api/dashboard/at-risk-trend
export const getAtRiskTrend = async (req, res) => {
  try {
    let scope;
    if (req.user.role === 'super_admin') {
      scope = {};
    } else if (req.user.role === 'advisor') {
      scope = scopeQueryToRole(req.user);
    } else {
      scope = scopeToUserDepartments(req);
    }
    if (scope._id === null) {
      return res.status(200).json({ status: 'success', data: [] });
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const students = await Student.find({ ...scope, enrolledAt: { $gte: twelveMonthsAgo } }).lean();

    const monthMap = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = { month: key, warning: 0, critical: 0, total: 0 };
    }

    for (const s of students) {
      const d = new Date(s.enrolledAt || s.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap[key]) {
        monthMap[key].total++;
        if (s.cgpaStatus === 'warning') monthMap[key].warning++;
        if (s.cgpaStatus === 'critical') monthMap[key].critical++;
      }
    }

    const data = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    console.error('[dashboardController.getAtRiskTrend]', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
