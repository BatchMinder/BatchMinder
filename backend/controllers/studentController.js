import Student from '../models/student.js';
import Batch from '../models/batch.js';
import Curriculum from '../models/curriculum.js';
import { scopeToUserDepartments } from '../middleware/scopeMiddleware.js';
import { logAudit, logNotification } from '../utils/logger.js';

export const getAllStudents = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(200).json({ status: 'success', data: { students: [] }, total: 0 });
    }

    const { batchId, status, cgpaStatus, search, page = 1, limit = 50 } = req.query;
    const filter = { ...scope };

    if (batchId) filter.batchId = batchId;
    if (status) filter.status = status;
    if (cgpaStatus) filter.cgpaStatus = cgpaStatus;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const students = await Student.find(filter)
      .populate('departmentId', 'name code')
      .populate('batchId', 'code startYear')
      .sort({ rollNumber: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Student.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: students.length,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: { students },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const student = await Student.findOne({ _id: req.params.id, ...scope })
      .populate('departmentId', 'name code')
      .populate('batchId', 'code startYear');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json({ status: 'success', data: { student } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createStudent = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { rollNumber, name, email, departmentId, batchId, currentSemester, cgpa } = req.body;

    if (!rollNumber || !name || !departmentId || !batchId) {
      return res.status(400).json({ message: 'Please provide rollNumber, name, departmentId, and batchId' });
    }

    if (scope.departmentId && scope.departmentId.$in) {
      if (!scope.departmentId.$in.includes(departmentId)) {
        return res.status(403).json({ message: 'Department not in your scope' });
      }
    }

    const existing = await Student.findOne({ rollNumber: rollNumber.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'Student with this roll number already exists' });
    }

    const student = await Student.create({
      rollNumber: rollNumber.toUpperCase().trim(),
      name,
      email,
      departmentId,
      batchId,
      currentSemester: currentSemester || 1,
      cgpa: cgpa !== undefined ? cgpa : 0.0,
    });

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'STUDENT_CREATED',
      targetType: 'Student',
      targetId: student._id.toString(),
      departmentId: departmentId.toString(),
      batchId: batchId.toString(),
      metadata: { description: `Created student ${student.name} (${student.rollNumber})` },
    });

    if (student.cgpaStatus === 'warning' || student.cgpaStatus === 'critical') {
      await logNotification({
        type: student.cgpaStatus,
        message: `Student ${student.name} (${student.rollNumber}) created in ${student.cgpaStatus} standing (CGPA: ${student.cgpa}).`,
        departmentId: departmentId.toString(),
        batchId: batchId.toString(),
        deepLinkUrl: `/admin/students`
      });
    }

    res.status(201).json({ status: 'success', data: { student } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const existingStudent = await Student.findOne({ _id: req.params.id, ...scope });
    if (!existingStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const oldCgpaStatus = existingStudent.cgpaStatus;

    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, ...scope },
      req.body,
      { new: true, runValidators: true }
    );

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'STUDENT_UPDATED',
      targetType: 'Student',
      targetId: student._id.toString(),
      departmentId: student.departmentId.toString(),
      batchId: student.batchId.toString(),
      metadata: { description: `Updated student ${student.name} (${student.rollNumber})` },
    });

    if (oldCgpaStatus !== student.cgpaStatus) {
      await logNotification({
        type: student.cgpaStatus === 'critical' ? 'critical' : (student.cgpaStatus === 'warning' ? 'warning' : 'info'),
        message: `Student ${student.name} (${student.rollNumber}) CGPA status changed from ${oldCgpaStatus} to ${student.cgpaStatus} (CGPA: ${student.cgpa}).`,
        departmentId: student.departmentId.toString(),
        batchId: student.batchId.toString(),
        deepLinkUrl: `/admin/students`
      });
    }

    res.status(200).json({ status: 'success', data: { student } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const student = await Student.findOneAndDelete({ _id: req.params.id, ...scope });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'STUDENT_DELETED',
      targetType: 'Student',
      targetId: student._id.toString(),
      departmentId: student.departmentId.toString(),
      batchId: student.batchId.toString(),
      metadata: { description: `Deleted student ${student.name} (${student.rollNumber})` },
    });

    res.status(200).json({ status: 'success', message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
