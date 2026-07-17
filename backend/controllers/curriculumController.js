import Curriculum from '../models/curriculum.js';
import Department from '../models/department.js';
import Batch from '../models/batch.js';
import { scopeToUserDepartments } from '../middleware/scopeMiddleware.js';
import { logAudit } from '../utils/logger.js';

export const getAllCurriculums = async (req, res) => {
  try {
    let scope = scopeToUserDepartments(req);
    // Advisors need to see the global course catalog to check prerequisites for any course
    if (req.user && req.user.role === 'advisor') {
      scope = {}; 
    }
    
    if (scope._id === null) {
      return res.status(200).json({ status: 'success', data: { curriculums: [] } });
    }

    const curriculums = await Curriculum.find(scope)
      .populate('departmentId', 'name code')
      .populate('batchId', 'code name')
      .sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', data: { curriculums } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCurriculumByBatch = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(200).json({ status: 'success', data: { curriculum: null } });
    }

    const { batchId } = req.params;

    const curriculum = await Curriculum.findOne({
      batchId,
      departmentId: scope.departmentId,
      status: 'active',
    }).populate('departmentId', 'name code').populate('batchId', 'code');

    if (!curriculum) {
      return res.status(404).json({ message: 'No active curriculum found for this batch' });
    }

    res.status(200).json({ status: 'success', data: { curriculum } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createOrUpdateCurriculum = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { batchId, departmentId, version, courses } = req.body;

    if (!batchId || !departmentId || !courses) {
      return res.status(400).json({ message: 'Please provide batchId, departmentId, and courses' });
    }

    if (scope.departmentId && scope.departmentId.$in) {
      const allowedDepts = scope.departmentId.$in.map(id => id.toString());
      if (!allowedDepts.includes(departmentId.toString())) {
        return res.status(403).json({ message: 'Department not in your scope' });
      }
    }

    const semesterCreditMap = {};
    for (const c of courses) {
      if (!c.semester) {
        return res.status(400).json({ message: 'Each course must have a semester' });
      }
      semesterCreditMap[c.semester] = (semesterCreditMap[c.semester] || 0) + (c.creditHours || 0);
    }

    for (const [sem, total] of Object.entries(semesterCreditMap)) {
      if (total > 21) {
        return res.status(400).json({
          message: `Semester ${sem} exceeds maximum credit hour limit of 21 (got ${total})`,
        });
      }
    }

    if (courses.length > 0) {
      const prereqIds = courses.flatMap(c => c.prerequisiteCourseIds || []).filter(Boolean);
      if (prereqIds.length > 0) {
        const validIds = courses.map(c => c._id || null).filter(Boolean);
        for (const pid of prereqIds) {
          if (!validIds.some(v => v && v.toString() === pid.toString())) {
            return res.status(400).json({
              message: `Prerequisite ${pid} not found in course list`,
            });
          }
        }
      }
    }

    const curriculum = await Curriculum.findOneAndUpdate(
      { batchId, departmentId, status: 'active' },
      { batchId, departmentId, version: version || '1.0', courses, status: 'active' },
      { new: true, upsert: true, runValidators: true }
    );

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'CURRICULUM_UPDATED',
      targetType: 'Curriculum',
      targetId: curriculum._id.toString(),
      departmentId: departmentId.toString(),
      metadata: { description: `Updated curriculum for batch ${batchId} with ${courses.length} courses` },
    });

    res.status(200).json({ status: 'success', data: { curriculum } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createOrUpdateCurriculumMap = async (req, res) => {
  try {
    const { department, batch, semester, courses } = req.body;

    let dept = await Department.findOne({ name: department });
    if (!dept) {
      dept = await Department.create({ name: department, code: 'CS', color: '#6366F1' });
    }

    let batchDoc = await Batch.findOne({ code: batch });
    if (!batchDoc) {
      batchDoc = await Batch.create({
        code: batch,
        dept: department,
        departmentId: dept._id,
        startYear: parseInt(batch) || 2022,
        advisor: 'Unassigned',
      });
    }

    const curriculum = await Curriculum.findOneAndUpdate(
      { batchId: batchDoc._id, departmentId: dept._id, semester: Number(semester) || 1 },
      {
        batchId: batchDoc._id,
        departmentId: dept._id,
        department,
        batch,
        semester: Number(semester) || 1,
        version: '1.0',
        courses: courses.map(c => ({
          code: c.courseCode,
          title: c.title,
          creditHours: c.creditHours,
          semester: Number(semester) || 1
        })),
        status: 'active'
      },
      { new: true, upsert: true, runValidators: true }
    );

    await logAudit({
      actorId: req.user?._id || new mongoose.Types.ObjectId(),
      actorRole: req.user?.role || 'admin',
      action: 'CURRICULUM_MAP_CREATED',
      targetType: 'Curriculum',
      targetId: curriculum._id.toString(),
      departmentId: dept._id.toString(),
      metadata: { description: `Created curriculum map for ${department} (Batch ${batch}, Semester ${semester})` }
    });

    res.status(200).json({ status: 'success', data: { curriculum } });
  } catch (error) {
    console.error('createOrUpdateCurriculumMap error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const getHECCurriculum = async (req, res) => {
  try {
    let hecDept = await Department.findOne({ code: 'HEC' });
    let hecBatch = await Batch.findOne({ code: 'HEC-2025' });

    if (!hecDept || !hecBatch) {
      return res.status(404).json({ message: 'HEC curriculum not found' });
    }

    const curriculum = await Curriculum.findOne({
      departmentId: hecDept._id,
      batchId: hecBatch._id
    });

    res.status(200).json({ status: 'success', data: { curriculum } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

