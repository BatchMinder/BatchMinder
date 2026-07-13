import Migration from '../models/migration.js';
import Student from '../models/student.js';
import { scopeToUserDepartments } from '../middleware/scopeMiddleware.js';
import { logAudit, logNotification } from '../utils/logger.js';

export const getAllMigrations = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(200).json({ status: 'success', data: { migrations: [] } });
    }

    const migrations = await Migration.find(scope)
      .populate({
        path: 'studentId',
        select: 'name rollNumber phone currentSemester batchId',
        populate: {
          path: 'batchId',
          select: 'code startYear'
        }
      })
      .populate('departmentId', 'code name')
      .populate('decidedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', results: migrations.length, data: { migrations } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createMigration = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { studentId, departmentId, sourceInstitution, transferredCourses } = req.body;

    if (!studentId || !departmentId || !sourceInstitution) {
      return res.status(400).json({ message: 'Please provide studentId, departmentId, and sourceInstitution' });
    }

    if (scope.departmentId && scope.departmentId.$in) {
      const allowedDepts = scope.departmentId.$in.map(id => id.toString());
      if (!allowedDepts.includes(departmentId.toString())) {
        return res.status(403).json({ message: 'Department not in your scope' });
      }
    }

    const migration = await Migration.create({
      studentId,
      departmentId,
      sourceInstitution,
      transferredCourses: transferredCourses || [],
    });

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'MIGRATION_CREATED',
      targetType: 'Migration',
      targetId: migration._id.toString(),
      departmentId: departmentId.toString(),
      metadata: { description: `Created migration request from ${sourceInstitution}` },
    });

    res.status(201).json({ status: 'success', data: { migration } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const decideMigration = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { courseDecisions, remarks } = req.body;

    if (!courseDecisions || !Array.isArray(courseDecisions) || courseDecisions.length === 0) {
      return res.status(400).json({ message: 'Please provide courseDecisions array' });
    }

    const migration = await Migration.findOne({ _id: id, ...scope });
    if (!migration) {
      return res.status(404).json({ message: 'Migration record not found' });
    }

    for (const decision of courseDecisions) {
      const { courseName, equivalencyStatus } = decision;
      if (!['accepted', 'rejected'].includes(equivalencyStatus)) {
        return res.status(400).json({ message: `Invalid status for ${courseName}: must be accepted or rejected` });
      }

      const course = migration.transferredCourses.find(
        c => c.courseName === courseName
      );
      if (!course) {
        return res.status(400).json({ message: `Course ${courseName} not found in migration record` });
      }

      if (equivalencyStatus === 'rejected' && !remarks) {
        return res.status(400).json({ message: 'Remarks are required when rejecting courses' });
      }

      course.equivalencyStatus = equivalencyStatus;
    }

    migration.decidedBy = req.user._id;
    migration.decidedAt = new Date();
    if (remarks) migration.remarks = remarks;

    // Determine overall status based on whether all are accepted or there is a rejection
    const hasRejected = migration.transferredCourses.some(c => c.equivalencyStatus === 'rejected');
    migration.status = hasRejected ? 'rejected' : 'approved';

    const acceptedCredits = migration.transferredCourses
      .filter(c => c.equivalencyStatus === 'accepted')
      .reduce((sum, c) => sum + c.credits, 0);

    if (migration.curriculumComparison) {
      migration.curriculumComparison.toCompletedCredits = acceptedCredits;
      migration.curriculumComparison.toRemainingCredits = Math.max(0, (migration.curriculumComparison.toRequiredCredits || 120) - acceptedCredits);
    }

    await migration.save();

    const student = await Student.findById(migration.studentId);
    let oldCgpaStatus = null;
    if (student) {
      oldCgpaStatus = student.cgpaStatus;

      // Recalculate degree progress & synchronize transferred courses to student profile
      for (const c of migration.transferredCourses) {
        const targetCode = c.mappedCourseName || c.courseName;
        const existingIdx = student.courses.findIndex(sc => sc.courseCode === targetCode);
        if (existingIdx !== -1) {
          if (c.equivalencyStatus === 'accepted') {
            student.courses[existingIdx].grade = 'A';
            student.courses[existingIdx].enrollmentStatus = 'completed';
            student.courses[existingIdx].status = 'completed';
            student.courses[existingIdx].creditHours = c.credits;
          } else if (c.equivalencyStatus === 'rejected') {
            student.courses[existingIdx].grade = 'F'; // Credit Loss
            student.courses[existingIdx].enrollmentStatus = 'failed';
            student.courses[existingIdx].status = 'failed';
            student.courses[existingIdx].creditHours = c.credits;
          }
        } else {
          if (c.equivalencyStatus === 'accepted') {
            student.courses.push({
              courseCode: targetCode,
              courseTitle: targetCode,
              creditHours: c.credits,
              grade: 'A',
              enrollmentStatus: 'completed',
              status: 'completed',
              semester: student.currentSemester || 1
            });
          } else if (c.equivalencyStatus === 'rejected') {
            student.courses.push({
              courseCode: targetCode,
              courseTitle: targetCode,
              creditHours: c.credits,
              grade: 'F', // Credit Loss
              enrollmentStatus: 'failed',
              status: 'failed',
              semester: student.currentSemester || 1
            });
          }
        }
      }

      if (acceptedCredits > 0) {
        student.cgpa = Math.min(4.0, student.cgpa + acceptedCredits * 0.01);
      }
      await student.save();
    }

    // 1. Log Audit
    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'MIGRATION_DECIDED',
      targetType: 'Migration',
      targetId: migration._id.toString(),
      departmentId: migration.departmentId.toString(),
      batchId: student ? student.batchId.toString() : undefined,
      metadata: {
        description: `Decided on migration for student ${student ? student.name : migration.studentId}`,
        acceptedCount: courseDecisions.filter(d => d.equivalencyStatus === 'accepted').length,
        rejectedCount: courseDecisions.filter(d => d.equivalencyStatus === 'rejected').length,
      },
    });

    // 2. Generate Migration Decision Notification
    await logNotification({
      type: 'info',
      message: `Migration request decided for student ${student ? student.name : 'Unknown'} (${student ? student.rollNumber : ''}).`,
      departmentId: migration.departmentId.toString(),
      batchId: student ? student.batchId.toString() : undefined,
      deepLinkUrl: `/admin/migrations`
    });

    // 3. Generate CGPA status change notification if status changed
    if (student && oldCgpaStatus !== student.cgpaStatus) {
      await logNotification({
        type: student.cgpaStatus === 'critical' ? 'critical' : (student.cgpaStatus === 'warning' ? 'warning' : 'info'),
        message: `Student ${student.name} (${student.rollNumber}) CGPA status changed from ${oldCgpaStatus} to ${student.cgpaStatus} (CGPA: ${student.cgpa}) after migration decision.`,
        departmentId: student.departmentId.toString(),
        batchId: student.batchId.toString(),
        deepLinkUrl: `/admin/students`
      });
    }

    res.status(200).json({ status: 'success', data: { migration } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMigration = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { transferredCourses, fromProgram, toProgram, curriculumComparison } = req.body;

    const migration = await Migration.findOne({ _id: id, ...scope });
    if (!migration) {
      return res.status(404).json({ message: 'Migration record not found' });
    }

    if (transferredCourses !== undefined) migration.transferredCourses = transferredCourses;
    if (fromProgram !== undefined) migration.fromProgram = fromProgram;
    if (toProgram !== undefined) migration.toProgram = toProgram;
    if (curriculumComparison !== undefined) migration.curriculumComparison = curriculumComparison;

    await migration.save();

    res.status(200).json({ status: 'success', data: { migration } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
