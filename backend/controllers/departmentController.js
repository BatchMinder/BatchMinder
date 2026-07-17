import Department from '../models/department.js';
import User from '../models/user.js';
import Student from '../models/student.js';
import Batch from '../models/batch.js';
import { logAudit } from '../utils/logger.js';

// Always returns consistent shape for the Dean frontend
const normalizeDept = async (d) => {
  // Student count: handle both old string 'department' and new ObjectId 'departmentId'
  const studentCount = await Student.countDocuments({
    $or: [
      { departmentId: d._id },
      { department: d.name } // legacy string field
    ]
  });

  // Batch count: handle both old string 'dept' and new ObjectId 'departmentId'
  const batchCount = await Batch.countDocuments({
    $or: [
      { departmentId: d._id },
      { dept: d.name } // legacy string field
    ]
  });

  // Resolve HOD name — prefer hodId ObjectId ref, fall back to legacy hod string
  let hodName = d.hod || 'Unassigned';
  if (d.hodId) {
    const hod = await User.findById(d.hodId).select('name');
    if (hod) hodName = hod.name;
  }

  return {
    _id: d._id,
    id: d._id,
    code: d.code,
    name: d.name,
    hod: hodName,
    hodId: d.hodId || null,
    established: d.established,
    status: d.status,
    color: d.color,
    students: studentCount,
    studentCount,
    batches: batchCount,
    batchCount,
  };
};

export const getAllDepartments = async (req, res) => {
  try {
    let departments;
    if (req.user.role === 'dean') {
      departments = await Department.find({}).sort({ code: 1 });
    } else {
      const ids = req.user.departmentIds || [];
      if (ids.length === 0) {
        return res.status(200).json({ status: 'success', results: 0, data: [] });
      }
      departments = await Department.find({ _id: { $in: ids } }).sort({ code: 1 });
    }

    const results = await Promise.all(departments.map(normalizeDept));
    res.status(200).json({ status: 'success', results: results.length, data: results });
  } catch (err) {
    console.error('[departmentController.getAllDepartments]', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const { code, name, hod, hodId, established, status, color } = req.body;

    if (!code || !name || !established) {
      return res.status(400).json({ status: 'error', message: 'code, name, and established year are required.' });
    }

    const existing = await Department.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ status: 'error', message: `Department with code "${code.toUpperCase()}" already exists.` });
    }

    // Resolve hodId from name if not provided
    let resolvedHodId = hodId || null;
    let resolvedHodName = hod || 'Unassigned';
    if (!resolvedHodId && hod && hod !== 'Unassigned') {
      const hodUser = await User.findOne({ name: hod, role: { $in: ['admin', 'academic_admin'] } });
      if (hodUser) resolvedHodId = hodUser._id;
    }
    if (resolvedHodId && resolvedHodName === 'Unassigned') {
      const hodUser = await User.findById(resolvedHodId).select('name');
      if (hodUser) resolvedHodName = hodUser.name;
    }

    const dept = await Department.create({
      code: code.toUpperCase(),
      name,
      hod: resolvedHodName,
      hodId: resolvedHodId,
      established: Number(established),
      status: status || 'Active',
      color: color || '#3B82F6',
    });

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'DEPARTMENT_CREATED',
      targetType: 'Department',
      targetId: dept._id.toString(),
      departmentId: dept._id.toString(),
      metadata: { description: `Created department ${dept.name} (${dept.code})` },
    });

    const result = await normalizeDept(dept);
    res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    console.error('[departmentController.createDepartment]', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, hod, hodId, established, status, color } = req.body;

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ status: 'error', message: 'Department not found.' });
    }

    // Only dean can update departments
    if (req.user.role !== 'dean') {
      return res.status(403).json({ status: 'error', message: 'Only Dean can update departments.' });
    }

    if (code) dept.code = code.toUpperCase();
    if (name) dept.name = name;
    if (established) dept.established = Number(established);
    if (status) dept.status = status;
    if (color) dept.color = color;

    // Handle HOD assignment
    let resolvedHodId = hodId || null;
    let resolvedHodName = hod || null;
    if (resolvedHodId) {
      const hodUser = await User.findById(resolvedHodId).select('name');
      if (hodUser) resolvedHodName = hodUser.name;
    } else if (resolvedHodName && resolvedHodName !== 'Unassigned') {
      const hodUser = await User.findOne({ name: resolvedHodName });
      if (hodUser) resolvedHodId = hodUser._id;
    }
    if (resolvedHodId !== undefined) dept.hodId = resolvedHodId;
    if (resolvedHodName !== null) dept.hod = resolvedHodName || 'Unassigned';

    await dept.save();

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'DEPARTMENT_UPDATED',
      targetType: 'Department',
      targetId: dept._id.toString(),
      departmentId: dept._id.toString(),
      metadata: { description: `Updated department ${dept.name} (${dept.code})` },
    });

    const result = await normalizeDept(dept);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    console.error('[departmentController.updateDepartment]', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'dean') {
      return res.status(403).json({ status: 'error', message: 'Only Dean can delete departments.' });
    }

    const dept = await Department.findByIdAndDelete(id);
    if (!dept) {
      return res.status(404).json({ status: 'error', message: 'Department not found.' });
    }

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'DEPARTMENT_DELETED',
      targetType: 'Department',
      targetId: dept._id.toString(),
      departmentId: dept._id.toString(),
      metadata: { description: `Deleted department ${dept.name} (${dept.code})` },
    });

    res.status(200).json({ status: 'success', message: `Department "${dept.name}" deleted.` });
  } catch (err) {
    console.error('[departmentController.deleteDepartment]', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
