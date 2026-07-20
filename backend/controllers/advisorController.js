import Student from '../models/student.js';
import Batch from '../models/batch.js';
import Curriculum from '../models/curriculum.js';


// GET: advisor dashboard counts of students by cgpaStatus
export const getDashboardSummary = async (req, res, next) => {
  try {
    const assignedBatches = req.user.assignedBatchIds || [];
    if (assignedBatches.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          stats: { total: 0, good: 0, warning: 0, critical: 0 },
          batches: []
        }
      });
    }

    const { batchId } = req.query;
    let targetBatchIds = [...assignedBatches];

    if (batchId) {
      const hasAccess = assignedBatches.some(id => id.toString() === batchId);
      if (!hasAccess) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: You are not assigned to this batch.'
        });
      }
      targetBatchIds = [batchId];
    }

    const statsResult = await Student.aggregate([
      { $match: { batchId: { $in: targetBatchIds } } },
      { $group: { _id: '$cgpaStatus', count: { $sum: 1 } } }
    ]);

    const stats = { total: 0, good: 0, warning: 0, critical: 0 };
    statsResult.forEach(item => {
      if (item._id === 'good') stats.good = item.count;
      if (item._id === 'warning') stats.warning = item.count;
      if (item._id === 'critical') stats.critical = item.count;
      stats.total += item.count;
    });

    const populatedBatches = await Batch.find({ _id: { $in: assignedBatches } }).select('code startYear');

    res.status(200).json({
      status: 'success',
      data: {
        stats,
        batches: populatedBatches
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET: advisor students list (paginated, filterable)
export const getStudents = async (req, res, next) => {
  try {
    const assignedBatches = req.user.assignedBatchIds || [];
    if (assignedBatches.length === 0) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: { students: [] }
      });
    }

    const { batchId, cgpaStatus, search, page = 1, limit = 25 } = req.query;
    let targetBatchIds = [...assignedBatches];

    if (batchId) {
      const hasAccess = assignedBatches.some(id => id.toString() === batchId);
      if (!hasAccess) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: You are not assigned to this batch.'
        });
      }
      targetBatchIds = [batchId];
    }

    const filter = { batchId: { $in: targetBatchIds } };

    if (cgpaStatus) {
      filter.cgpaStatus = cgpaStatus;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Default sort in ascending order by rollNumber (e.g. BSCS-23F-0003, BSCS-23S-0016, BSCS-23F-0027)
    const students = await Student.find(filter)
      .populate('batchId', 'code')
      .populate('departmentId', 'name code')
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
      data: {
        students
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET: single student details profile view
export const getStudentById = async (req, res, next) => {
  try {
    const assignedBatches = req.user.assignedBatchIds || [];
    const student = await Student.findById(req.params.id)
      .populate('batchId', 'code')
      .populate('departmentId', 'name code');

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found.'
      });
    }

    const hasAccess = assignedBatches.some(id => id.toString() === student.batchId._id.toString());
    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: Student does not belong to your assigned batches.'
      });
    }


    res.status(200).json({
      status: 'success',
      data: {
        student
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET: eligible courses for a student (enrolled vs curriculum)
export const getStudentEligibleCourses = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found.'
      });
    }

    // Security check: Verify advisor is assigned to student's batch
    const assignedBatches = req.user.assignedBatchIds || [];
    const hasAccess = assignedBatches.some(id => id.toString() === student.batchId.toString());
    if (!hasAccess && req.user.role !== 'super_admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not assigned to this student\'s batch.'
      });
    }

    // Fetch active curriculum courses matching HEC version, department or batch
    let curriculum = await Curriculum.findOne({ version: 'HEC-2025-BSCS' });
    if (!curriculum && student.batchId) {
      curriculum = await Curriculum.findOne({ batchId: student.batchId });
    }
    if (!curriculum && student.departmentId) {
      curriculum = await Curriculum.findOne({ departmentId: student.departmentId });
    }

    // Active currently enrolled courses for current semester (for drop / withdrawal)
    const activeEnrolledCourses = (student.courses || []).filter(c =>
      c.status === 'enrolled' || c.enrollmentStatus === 'enrolled' || c.grade === 'IP' || c.semester === student.currentSemester
    );

    const activeEnrolledCodes = new Set(activeEnrolledCourses.map(c => c.courseCode));
    let curriculumCourses = curriculum && curriculum.courses ? curriculum.courses : [];
    
    // Available curriculum courses to register (matching student semester up to current)
    const availableCourses = curriculumCourses.filter(c => c.semester <= (student.currentSemester || 1) && !activeEnrolledCodes.has(c.code));
    const finalCurriculumCourses = availableCourses.length > 0 ? availableCourses : curriculumCourses.filter(c => !activeEnrolledCodes.has(c.code));

    res.status(200).json({
      status: 'success',
      data: {
        enrolledCourses: activeEnrolledCourses.length > 0 ? activeEnrolledCourses : (student.courses || []),
        curriculumCourses: finalCurriculumCourses
      }
    });
  } catch (err) {
    next(err);
  }
};

