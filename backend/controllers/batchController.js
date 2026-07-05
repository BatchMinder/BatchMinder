import Batch from '../models/batch.js';
import Student from '../models/student.js';
import { logAudit } from '../utils/logger.js';

// GET: list all batches with dynamic student counts
export const getAllBatches = async (req, res, next) => {
  try {
    const batches = await Batch.find({}).sort({ code: 1 });
    const results = [];

    for (const b of batches) {
      const studentCount = await Student.countDocuments({ batch: b.code });
      results.push({
        id: b._id,
        code: b.code,
        dept: b.dept,
        advisor: b.advisor || 'Unassigned',
        students: studentCount,
        status: b.advisor && b.advisor !== 'Unassigned' ? (b.status === 'Unassigned' ? 'Allocated' : b.status) : 'Unassigned',
        createdAt: b.createdAt
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

// POST: create a batch
export const createBatch = async (req, res, next) => {
  try {
    const { code, dept, advisor, status } = req.body;

    const existing = await Batch.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: 'A batch with this code already exists'
      });
    }

    const newBatch = await Batch.create({
      code: code.toUpperCase(),
      dept,
      advisor: advisor || 'Unassigned',
      status: advisor && advisor !== 'Unassigned' ? (status || 'Allocated') : 'Unassigned'
    });

    // Log action
    await logAudit({
      actorId: req.user ? req.user._id : null,
      actorRole: req.user ? req.user.role : null,
      action: 'BATCH_CREATE',
      targetType: 'Batch',
      targetId: newBatch._id.toString(),
      departmentId: newBatch.dept || '',
      batchId: newBatch.code || ''
    });

    res.status(201).json({
      status: 'success',
      data: newBatch
    });
  } catch (err) {
    next(err);
  }
};

// PATCH: update batch (e.g. allocating advisor)
export const updateBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, dept, advisor, status } = req.body;

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        status: 'error',
        message: 'Batch not found'
      });
    }

    if (code) batch.code = code.toUpperCase();
    if (dept) batch.dept = dept;
    if (advisor !== undefined) {
      batch.advisor = advisor;
      if (advisor === 'Unassigned') {
        batch.status = 'Unassigned';
      } else {
        batch.status = status || 'Allocated';
      }
    } else if (status) {
      batch.status = status;
    }

    await batch.save();

    // Log action
    await logAudit({
      actorId: req.user ? req.user._id : null,
      actorRole: req.user ? req.user.role : null,
      action: 'BATCH_ALLOCATE',
      targetType: 'Batch',
      targetId: batch._id.toString(),
      departmentId: batch.dept || '',
      batchId: batch.code || ''
    });

    res.status(200).json({
      status: 'success',
      data: batch
    });
  } catch (err) {
    next(err);
  }
};

// DELETE: delete batch
export const deleteBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findByIdAndDelete(id);
    if (!batch) {
      return res.status(404).json({
        status: 'error',
        message: 'Batch not found'
      });
    }

    // Log action
    await logAudit({
      actorId: req.user ? req.user._id : null,
      actorRole: req.user ? req.user.role : null,
      action: 'BATCH_DELETE',
      targetType: 'Batch',
      targetId: batch._id.toString(),
      departmentId: batch.dept || '',
      batchId: batch.code || ''
    });

    res.status(200).json({
      status: 'success',
      message: 'Batch deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
