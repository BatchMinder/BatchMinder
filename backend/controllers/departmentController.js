import Department from '../models/department.js';
import Student from '../models/student.js';
import Batch from '../models/batch.js';
import User from '../models/user.js';
import { logAudit } from '../utils/logger.js';
import AuditLog from '../models/auditLog.js';

// GET: list all departments with dynamic stats
export const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({}).sort({ code: 1 });
    const results = [];

    for (const d of departments) {
      // Map names or codes to match collections
      // e.g. Student model might have department = 'Computer Science'
      const studentCount = await Student.countDocuments({ department: d.name });
      const batchCount = await Batch.countDocuments({ dept: d.name });
      const advisorCount = await User.countDocuments({ role: 'advisor', dept: d.name });

      results.push({
        id: d._id,
        code: d.code,
        name: d.name,
        hod: d.hod || 'Unassigned',
        established: d.established,
        status: d.status,
        color: d.color,
        students: studentCount,
        batches: batchCount,
        advisors: advisorCount
      });
    }

    res.status(200).json({
      status: 'success',
      results: results.length,
      data: results
    });
  } catch (err) {
    next(err);
  }
};

// POST: create a department
export const createDepartment = async (req, res, next) => {
  try {
    const { code, name, hod, established, status, color } = req.body;

    const existing = await Department.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: 'A department with this code already exists'
      });
    }

    const newDept = await Department.create({
      code: code.toUpperCase(),
      name,
      hod: hod || 'Unassigned',
      established,
      status: status || 'Active',
      color: color || '#3B82F6'
    });

    // Log action
    await logAudit({
      actorId: req.user ? req.user._id : null,
      actorRole: req.user ? req.user.role : null,
      action: 'DEPT_CREATE',
      targetType: 'Department',
      targetId: newDept._id.toString(),
      departmentId: newDept.name || ''
    });

    res.status(201).json({
      status: 'success',
      data: newDept
    });
  } catch (err) {
    next(err);
  }
};

// PATCH: update department
export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, hod, established, status, color } = req.body;

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({
        status: 'error',
        message: 'Department not found'
      });
    }

    if (name) dept.name = name;
    if (hod) dept.hod = hod;
    if (established) dept.established = established;
    if (status) dept.status = status;
    if (color) dept.color = color;

    await dept.save();

    // Log action
    await logAudit({
      actorId: req.user ? req.user._id : null,
      actorRole: req.user ? req.user.role : null,
      action: 'DEPT_UPDATE',
      targetType: 'Department',
      targetId: dept._id.toString(),
      departmentId: dept.name || ''
    });

    res.status(200).json({
      status: 'success',
      data: dept
    });
  } catch (err) {
    next(err);
  }
};

// DELETE: delete department
export const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dept = await Department.findByIdAndDelete(id);
    if (!dept) {
      return res.status(404).json({
        status: 'error',
        message: 'Department not found'
      });
    }

    // Log action
    await logAudit({
      actorId: req.user ? req.user._id : null,
      actorRole: req.user ? req.user.role : null,
      action: 'DEPT_DELETE',
      targetType: 'Department',
      targetId: dept._id.toString(),
      departmentId: dept.name || ''
    });

    res.status(200).json({
      status: 'success',
      message: 'Department deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
