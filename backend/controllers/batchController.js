import mongoose from 'mongoose';
import Batch from '../models/batch.js';
import Student from '../models/student.js';
import Department from '../models/department.js';
import User from '../models/user.js';
import { scopeToUserDepartments } from '../middleware/scopeMiddleware.js';
import { logAudit } from '../utils/logger.js';

// Helper to synchronize advisor's assignedBatchIds
const syncAdvisorBatches = async (batchId, oldAdvisorId, newAdvisorId) => {
  const batchObjectId = new mongoose.Types.ObjectId(batchId);

  // 1. Remove batch from old advisor if different
  if (oldAdvisorId && oldAdvisorId.toString() !== newAdvisorId?.toString()) {
    await User.findByIdAndUpdate(oldAdvisorId, {
      $pull: { assignedBatchIds: batchObjectId }
    });
  }

  // 2. Add batch to new advisor
  if (newAdvisorId) {
    await User.findByIdAndUpdate(newAdvisorId, {
      $addToSet: { assignedBatchIds: batchObjectId }
    });
  }
};

// Helper to extract start year from batch code
const extractStartYear = (code) => {
  if (!code) return null;
  // Match 4 digits: e.g. 2023, 2024
  const fourDigitMatch = code.match(/\b(19|20)\d{2}\b/) || code.match(/(19|20)\d{2}/);
  if (fourDigitMatch) {
    return parseInt(fourDigitMatch[0], 10);
  }
  // Match 2 digits at the end: e.g. BSCS22, BSCS23
  const twoDigitMatch = code.match(/\d{2}$/);
  if (twoDigitMatch) {
    const yr = parseInt(twoDigitMatch[0], 10);
    return yr < 50 ? 2000 + yr : 1900 + yr;
  }
  return null;
};

// Helper to resolve advisor name and ID
const resolveAdvisor = async (advisor, advisorId) => {
  let resolvedId = null;
  let resolvedName = 'Unassigned';

  // 1. If advisorId is provided and is a valid ObjectId, look up the user
  if (advisorId && mongoose.isValidObjectId(advisorId)) {
    const user = await User.findById(advisorId);
    if (user) {
      resolvedId = user._id;
      resolvedName = user.name;
      return { advisorId: resolvedId, advisor: resolvedName };
    }
  }

  // 2. If advisor (as name or ObjectId) is provided
  if (advisor) {
    if (mongoose.isValidObjectId(advisor)) {
      const user = await User.findById(advisor);
      if (user) {
        resolvedId = user._id;
        resolvedName = user.name;
        return { advisorId: resolvedId, advisor: resolvedName };
      }
    } else if (advisor !== 'Unassigned' && advisor.trim() !== '') {
      // Find user by name
      const user = await User.findOne({ name: advisor });
      if (user) {
        resolvedId = user._id;
        resolvedName = user.name;
      } else {
        resolvedName = advisor; // fallback if it's a custom string
      }
      return { advisorId: resolvedId, advisor: resolvedName };
    }
  }

  return { advisorId: resolvedId, advisor: resolvedName };
};

// Normalize a batch doc to always include a `dept` string for the frontend
const normalizeBatch = async (b) => {
  let deptName = b.dept || '';

  // If batch has the new departmentId field (ObjectId), resolve name from it
  if (!deptName && b.departmentId) {
    const deptDoc = await Department.findById(b.departmentId);
    if (deptDoc) deptName = deptDoc.name;
  }

  // If departmentId is a populated object (via .populate())
  if (b.departmentId && typeof b.departmentId === 'object' && b.departmentId.name) {
    deptName = b.departmentId.name;
  }

  const studentCount = await Student.countDocuments({
    $or: [
      { batchId: b._id },
      { batch: b.code } // legacy string field
    ]
  });

  let advisorIdVal = null;
  if (b.advisorId) {
    advisorIdVal = b.advisorId._id || b.advisorId;
  }

  return {
    _id: b._id,
    id: b._id,
    code: b.code,
    dept: deptName,
    departmentId: b.departmentId || null,
    startYear: b.startYear || null,
    curriculumVersionId: b.curriculumVersionId || null,
    advisor: b.advisor || 'Unassigned',
    advisorId: advisorIdVal || null,
    status: b.status || 'Unassigned',
    students: studentCount,
    studentCount,
    createdAt: b.createdAt,
  };
};

export const getAllBatches = async (req, res) => {
  try {
    // Super admin sees all batches; scoped roles see only their department's batches
    let filter = {};
    if (req.user.role !== 'super_admin') {
      const scope = scopeToUserDepartments(req);
      if (scope._id === null) {
        return res.status(200).json({ status: 'success', results: 0, data: [] });
      }
      filter = scope;
    }

    const batches = await Batch.find(filter)
      .populate('departmentId', 'name code color')
      .populate('advisorId', 'name email')
      .sort({ code: 1 });

    const results = await Promise.all(batches.map(normalizeBatch));

    res.status(200).json({ status: 'success', results: results.length, data: results });
  } catch (err) {
    console.error('[batchController.getAllBatches]', err);
    res.status(500).json({ message: err.message });
  }
};

export const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('departmentId', 'name code color')
      .populate('curriculumVersionId', 'version')
      .populate('advisorId', 'name email');

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const result = await normalizeBatch(batch);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    console.error('[batchController.getBatchById]', err);
    res.status(500).json({ message: err.message });
  }
};

export const createBatch = async (req, res) => {
  try {
    // Accept both old `dept` (string) and new `departmentId` (ObjectId)
    const { code, dept, departmentId, startYear, advisor, advisorId } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Please provide batch code' });
    }

    // Resolve deptName for legacy compatibility
    let deptName = dept || '';
    let resolvedDeptId = departmentId || null;

    // If departmentId given, look up name
    if (resolvedDeptId && !deptName) {
      const deptDoc = await Department.findById(resolvedDeptId);
      if (deptDoc) deptName = deptDoc.name;
    }

    // If dept name given, look up ObjectId
    if (deptName && !resolvedDeptId) {
      const deptDoc = await Department.findOne({ name: deptName });
      if (deptDoc) resolvedDeptId = deptDoc._id;
    }

    const existing = await Batch.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: 'Batch with this code already exists' });
    }

    // Resolve advisor and advisorId
    const resolved = await resolveAdvisor(advisor, advisorId);

    const parsedStartYear = parseInt(startYear, 10) || extractStartYear(code) || new Date().getFullYear();

    const batch = await Batch.create({
      code: code.toUpperCase(),
      dept: deptName,
      departmentId: resolvedDeptId,
      startYear: parsedStartYear,
      advisor: resolved.advisor,
      advisorId: resolved.advisorId,
      status: resolved.advisor && resolved.advisor !== 'Unassigned' ? 'Allocated' : 'Unassigned',
    });

    if (resolved.advisorId) {
      await syncAdvisorBatches(batch._id, null, resolved.advisorId);
    }

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'BATCH_CREATED',
      targetType: 'Batch',
      targetId: batch._id.toString(),
      departmentId: resolvedDeptId ? resolvedDeptId.toString() : deptName,
      metadata: { description: `Created batch ${batch.code}` },
    });

    const result = await normalizeBatch(batch);
    res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    console.error('[batchController.createBatch]', err);
    res.status(500).json({ message: err.message });
  }
};

export const updateBatch = async (req, res) => {
  try {
    const { dept, departmentId, ...rest } = req.body;

    const existingBatch = await Batch.findById(req.params.id);
    if (!existingBatch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    const oldAdvisorId = existingBatch.advisorId;

    // Resolve both fields if one is provided
    let updateFields = { ...rest };
    if (updateFields.startYear !== undefined) {
      updateFields.startYear = parseInt(updateFields.startYear, 10) || extractStartYear(existingBatch.code) || new Date().getFullYear();
    }
    if (dept) {
      updateFields.dept = dept;
      if (!departmentId) {
        const deptDoc = await Department.findOne({ name: dept });
        if (deptDoc) updateFields.departmentId = deptDoc._id;
      }
    }
    if (departmentId) {
      updateFields.departmentId = departmentId;
      if (!dept) {
        const deptDoc = await Department.findById(departmentId);
        if (deptDoc) updateFields.dept = deptDoc.name;
      }
    }

    // Auto-set status from advisor and update advisorId/advisor name
    if (updateFields.advisor !== undefined || updateFields.advisorId !== undefined) {
      const resolved = await resolveAdvisor(updateFields.advisor, updateFields.advisorId);
      updateFields.advisor = resolved.advisor;
      updateFields.advisorId = resolved.advisorId;
      updateFields.status = resolved.advisor && resolved.advisor !== 'Unassigned'
        ? 'Allocated'
        : 'Unassigned';
    }

    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('departmentId', 'name code color').populate('advisorId', 'name email');

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Sync advisor assignments if advisor changed
    const newAdvisorId = batch.advisorId?._id || batch.advisorId;
    if (String(oldAdvisorId || '') !== String(newAdvisorId || '')) {
      await syncAdvisorBatches(batch._id, oldAdvisorId, newAdvisorId);
    }

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'BATCH_UPDATED',
      targetType: 'Batch',
      targetId: batch._id.toString(),
      departmentId: batch.departmentId ? batch.departmentId.toString() : batch.dept,
      metadata: { description: `Updated batch ${batch.code}` },
    });

    const result = await normalizeBatch(batch);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    console.error('[batchController.updateBatch]', err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    if (batch.advisorId) {
      await User.findByIdAndUpdate(batch.advisorId, {
        $pull: { assignedBatchIds: batch._id }
      });
    }

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'BATCH_DELETED',
      targetType: 'Batch',
      targetId: batch._id.toString(),
      departmentId: batch.departmentId ? batch.departmentId.toString() : batch.dept,
      metadata: { description: `Deleted batch ${batch.code}` },
    });

    res.status(200).json({ status: 'success', message: 'Batch deleted' });
  } catch (err) {
    console.error('[batchController.deleteBatch]', err);
    res.status(500).json({ message: err.message });
  }
};
