import ApprovalRequest from '../models/approvalRequest.js';
import Student from '../models/student.js';
import Curriculum from '../models/curriculum.js';
import { resolveCurriculumForStudent } from '../utils/curriculumResolver.js';
import Department from '../models/department.js';
import Batch from '../models/batch.js';
import { logAudit, logNotification } from '../utils/logger.js';

// Pre-submission validation function (Step 2)
export const validateApprovalRequest = async (studentId, courseCode, courseTitle, creditHours, requestType) => {
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  // FR-4.6 Duplicate detection & Active Enrollment check
  const hasActiveEnrollment = student.courses.some(
    c => c.courseCode.toUpperCase() === courseCode.toUpperCase() && c.enrollmentStatus === 'enrolled'
  );

  if (requestType === 'add' || requestType === 'special_permission') {
    // 1. Check if student already has active enrollment
    if (hasActiveEnrollment) {
      return {
        isValid: false,
        failureType: 'duplicate',
        reason: `Duplicate course detected: Student is already active in ${courseCode.toUpperCase()} for this semester.`
      };
    }

    // 2. Check if student has pending or approved add request
    const hasPendingRequest = await ApprovalRequest.findOne({
      studentId,
      courseCode: courseCode.toUpperCase(),
      requestType: { $in: ['add', 'special_permission'] },
      status: { $in: ['pending', 'advisor_approved', 'approved', 'special_granted'] }
    });
    if (hasPendingRequest) {
      return {
        isValid: false,
        failureType: 'duplicate',
        reason: `Duplicate request: Student already has a pending or approved request to add ${courseCode.toUpperCase()}.`
      };
    }
  } else if (requestType === 'drop' || requestType === 'withdrawal') {
    // 1. Verify student is actually active/enrolled in the course they want to drop/withdraw
    if (!hasActiveEnrollment) {
      return {
        isValid: false,
        reason: `Invalid request: Student is not currently active/enrolled in ${courseCode.toUpperCase()}.`
      };
    }

    // 2. Verify there isn't already a pending drop/withdrawal request
    const hasPendingRequest = await ApprovalRequest.findOne({
      studentId,
      courseCode: courseCode.toUpperCase(),
      requestType,
      status: { $in: ['pending', 'advisor_approved'] }
    });
    if (hasPendingRequest) {
      return {
        isValid: false,
        failureType: 'duplicate',
        reason: `Duplicate request: Student already has a pending ${requestType} request for ${courseCode.toUpperCase()}.`
      };
    }
  }

  // FR-4.4 Prerequisite validation
  const curriculum = await resolveCurriculumForStudent(student);

  if (curriculum) {
    // Look up the requested course in curriculum
    const curriculumCourse = curriculum.courses.find(
      c => c.code.toUpperCase() === courseCode.toUpperCase()
    );

    if (curriculumCourse) {
      if (curriculumCourse.semester > student.currentSemester) {
        return {
          isValid: false,
          isFutureSemester: true,
          reason: `Invalid request: Cannot request course ${courseCode.toUpperCase()} from a future semester (${curriculumCourse.semester} > current ${student.currentSemester}).`
        };
      }
    }

    if (curriculumCourse && curriculumCourse.prerequisiteCourseIds && curriculumCourse.prerequisiteCourseIds.length > 0) {
      const deficientPrereqs = [];

      for (const prereqId of curriculumCourse.prerequisiteCourseIds) {
        // Resolve prerequisite course details in curriculum
        const prereqCourse = curriculum.courses.id(prereqId);
        if (prereqCourse) {
          // Check if student completed this course
          const isCompleted = student.courses.some(
            c => c.courseCode.toUpperCase() === prereqCourse.code.toUpperCase() && c.enrollmentStatus === 'completed'
          );
          if (!isCompleted) {
            deficientPrereqs.push(`${prereqCourse.code} (${prereqCourse.title})`);
          }
        }
      }

      if (deficientPrereqs.length > 0) {
        return {
          isValid: false,
          reason: `Prerequisite validation failed: Student must complete the following prerequisite(s) first: ${deficientPrereqs.join(', ')}`
        };
      }
    }
  }

  // FR-4.5 Credit hour validation
  if (requestType === 'add' || requestType === 'special_permission') {
    const currentCredits = student.courses
      .filter(c => c.enrollmentStatus === 'enrolled')
      .reduce((sum, c) => sum + c.creditHours, 0);

    // Cap is configured per department (Department.creditHourCap); falls back
    // to 18 CH if the department record is missing the field or unreachable.
    const department = await Department.findById(student.departmentId);
    const limit = department?.creditHourCap || 18;
    const projected = currentCredits + creditHours;

    if (projected > limit) {
      return {
        isValid: false,
        reason: `Credit hour limit exceeded: Projected semester total (${projected} CH) exceeds institutional cap of ${limit} CH. (Current: ${currentCredits} CH, Attempted: ${creditHours} CH).`
      };
    }
  }

  return { isValid: true };
};

// POST: advisor creates request (Advisor only)
export const createAdvisorRequest = async (req, res, next) => {
  try {
    const { studentId, courseCode, courseTitle, creditHours, requestType, justification } = req.body;

    if (!studentId || !courseCode || !courseTitle || !creditHours || !requestType) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields.'
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found.'
      });
    }

    // Security check: Only advisor assigned to student's batch can submit
    const assignedBatches = req.user.assignedBatchIds || [];
    const hasAccess = assignedBatches.some(id => id.toString() === student.batchId.toString());
    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not assigned to this student\'s batch.'
      });
    }

    // Run business validations
    const validation = await validateApprovalRequest(studentId, courseCode, courseTitle, creditHours, requestType);
    let prereqCheck = 'Passed';
    let validationFailureReason = '';
    let duplicateWarning = '';

    if (!validation.isValid) {
      if (validation.isFutureSemester) {
        // Hard block: requesting a course from a future semester is a data-integrity
        // issue, not a waivable academic rule — no HOD override applies here.
        return res.status(400).json({
          status: 'error',
          message: validation.reason
        });
      }

      // Prerequisite / credit-hour / duplicate failures are NOT blocked here.
      // Override authority belongs to the HOD at final approval (FR-4, Module 4
      // workflow) — the request is flagged and still routed through the normal
      // Advisor (Level-1) -> HOD (Level-2) chain so the HOD can review and decide
      // whether to override, with mandatory justification, at resolveHODDecision.
      prereqCheck = 'Failed';
      validationFailureReason = validation.reason;
      if (validation.failureType === 'duplicate') {
        duplicateWarning = validation.reason;
      }
    }

    let isBacklog = false;
    if (requestType === 'add' || requestType === 'special_permission') {
      const curriculum = await resolveCurriculumForStudent(student);
      if (curriculum) {
        const curriculumCourse = curriculum.courses.find(
          c => c.code.toUpperCase() === courseCode.toUpperCase()
        );
        if (curriculumCourse && curriculumCourse.semester < student.currentSemester) {
          isBacklog = true;
        }
      }
    }

    const request = await ApprovalRequest.create({
      studentId,
      advisorId: req.user._id,
      departmentId: student.departmentId,
      batchId: student.batchId,
      courseCode: courseCode.trim().toUpperCase(),
      courseTitle: courseTitle.trim(),
      creditHours,
      requestType,
      justification,
      status: 'pending',
      currentApproverRole: 'advisor',
      submittedBy: req.user._id,
      prereqCheck,
      duplicateWarning,
      validationFailureReason,
      overrideJustification: '',
      isBacklog
    });

    // Log audit
    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'REQUEST_CREATED',
      targetType: 'ApprovalRequest',
      targetId: request._id.toString(),
      departmentId: student.departmentId.toString(),
      batchId: student.batchId.toString(),
      metadata: { description: `Advisor created request for student ${student.rollNumber}` }
    });

    if (prereqCheck === 'Failed') {
      await logAudit({
        actorId: req.user._id,
        actorRole: req.user.role,
        action: 'REQUEST_FLAGGED_VALIDATION_FAILED',
        targetType: 'ApprovalRequest',
        targetId: request._id.toString(),
        departmentId: student.departmentId.toString(),
        batchId: student.batchId.toString(),
        metadata: { reason: validationFailureReason }
      });
    }

    // Populate and send response
    const populated = await ApprovalRequest.findById(request._id)
      .populate('studentId', 'name rollNumber cgpa currentSemester')
      .populate('advisorId', 'name email');

    res.status(201).json({
      status: 'success',
      data: { request: populated }
    });
  } catch (err) {
    next(err);
  }
};

// POST: advisor resolves decision (Approve / Reject)
export const resolveAdvisorDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const isApprove = req.path.includes('approve');

    const request = await ApprovalRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Request not found.'
      });
    }

    // Security check
    const assignedBatches = req.user.assignedBatchIds || [];
    const hasAccess = assignedBatches.some(bid => bid.toString() === request.batchId.toString());
    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: Student does not belong to your assigned batches.'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Decision already recorded or escalated.'
      });
    }

    if (!isApprove && (!remarks || remarks.trim() === '')) {
      return res.status(400).json({
        status: 'error',
        message: 'Remarks are required when rejecting a request.'
      });
    }

    const isReturned = !isApprove && remarks && remarks.trim().startsWith('[Returned for Edit]');

    if (isApprove) {
      request.status = 'advisor_approved';
      request.currentApproverRole = 'hod';
    } else if (isReturned) {
      // The advisor is both the submitter and the Level-1 approver (no student
      // login exists), so a "returned for edit" request comes right back to the
      // advisor to revise and resubmit — see resubmitAdvisorRequest below.
      request.status = 'returned_for_edit';
      request.currentApproverRole = 'advisor';
    } else {
      request.status = 'advisor_rejected';
      request.currentApproverRole = 'none';
    }

    request.advisorDecision = {
      decidedBy: req.user._id,
      decidedAt: new Date(),
      remarks: remarks ? remarks.trim() : ''
    };
    request.advisorRemarks = remarks ? remarks.trim() : '';

    await request.save();

    const student = await Student.findById(request.studentId);

    // Log audit
    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: isApprove ? 'REQUEST_APPROVED_ADVISOR' : (isReturned ? 'REQUEST_RETURNED_ADVISOR' : 'REQUEST_REJECTED_ADVISOR'),
      targetType: 'ApprovalRequest',
      targetId: request._id.toString(),
      departmentId: request.departmentId.toString(),
      batchId: request.batchId.toString(),
      metadata: { remarks }
    });

    // Notify next role (HOD) on approval
    if (isApprove) {
      const dept = await Department.findById(request.departmentId);
      if (dept && dept.hodId) {
        await logNotification({
          recipientId: dept.hodId,
          recipientRole: 'admin',
          type: 'info',
          message: `New workflow request for student ${student.name} (${student.rollNumber}) is pending your approval.`,
          departmentId: request.departmentId.toString(),
          batchId: request.batchId.toString(),
          deepLinkUrl: '/admin/dashboard'
        });
      }
    }

    const populated = await ApprovalRequest.findById(request._id)
      .populate('studentId', 'name rollNumber cgpa currentSemester')
      .populate('advisorId', 'name email');

    res.status(200).json({
      status: 'success',
      data: { request: populated }
    });
  } catch (err) {
    next(err);
  }
};

// GET: list advisor batches' requests
export const listAdvisorRequests = async (req, res, next) => {
  try {
    const assignedBatches = req.user.assignedBatchIds || [];
    if (assignedBatches.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: { requests: [] }
      });
    }

    const filter = { batchId: { $in: assignedBatches } };

    const { status, requestType, search } = req.query;
    if (status) filter.status = status;
    if (requestType) filter.requestType = requestType;

    const requests = await ApprovalRequest.find(filter)
      .populate('studentId', 'name rollNumber cgpa currentSemester')
      .populate('advisorId', 'name email')
      .populate('advisorDecision.decidedBy', 'name')
      .populate('hodDecision.decidedBy', 'name')
      .sort({ createdAt: -1 });

    // Enforce search dynamically on populated data if search string exists
    let results = requests;
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      results = requests.filter(r => {
        const student = r.studentId || {};
        return (
          student.name?.toLowerCase().includes(q) ||
          student.rollNumber?.toLowerCase().includes(q) ||
          r.courseCode?.toLowerCase().includes(q) ||
          r.courseTitle?.toLowerCase().includes(q)
        );
      });
    }

    // Attach dynamic validations object for the AdvisorQueue UI
    const detailedResults = await Promise.all(results.map(async (r) => {
      const student = await Student.findById(r.studentId);
      const currentCredits = student ? student.courses
        .filter(c => c.enrollmentStatus === 'enrolled')
        .reduce((sum, c) => sum + c.creditHours, 0) : 0;

      const maxCredits = student ? ((await Department.findById(student.departmentId))?.creditHourCap || 18) : 18;

      let prerequisites = [];
      if (student) {
        const curriculum = await resolveCurriculumForStudent(student);
        if (curriculum) {
          const curriculumCourse = curriculum.courses.find(c => c.code.toUpperCase() === r.courseCode.toUpperCase());
          if (curriculumCourse && curriculumCourse.prerequisiteCourseIds && curriculumCourse.prerequisiteCourseIds.length > 0) {
            for (const prereqId of curriculumCourse.prerequisiteCourseIds) {
              const prereqCourse = curriculum.courses.id(prereqId);
              if (prereqCourse) {
                const isCompleted = student.courses.some(c => c.courseCode.toUpperCase() === prereqCourse.code.toUpperCase() && c.enrollmentStatus === 'completed');
                prerequisites.push({
                  courseCode: prereqCourse.code,
                  courseTitle: prereqCourse.title,
                  status: isCompleted ? 'Completed' : 'Missing'
                });
              }
            }
          }
        }
      }

      const validations = {
        currentCredits,
        maxCredits,
        prerequisites
      };

      // Map request to the exact flat object formatting expected in AdvisorQueue.jsx
      return {
        id: r._id.toString(),
        _id: r._id.toString(),
        studentName: student ? student.name : 'N/A',
        rollNo: student ? student.rollNumber : 'N/A',
        cgpa: student ? parseFloat(student.cgpa || 0).toFixed(2) : '0.00',
        type: r.requestType === 'add' ? 'Course Add' : r.requestType === 'drop' ? 'Course Drop' : r.requestType === 'withdrawal' ? 'Course Withdrawal' : 'Special Permission',
        requestType: r.requestType,
        courseCode: r.courseCode,
        courseName: r.courseTitle,
        courseTitle: r.courseTitle,
        courseCredits: r.creditHours,
        creditHours: r.creditHours,
        status: r.status === 'pending' ? 'Pending Advisor' : r.status === 'advisor_approved' ? 'Forwarded to HOD' : r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : r.status,
        rawStatus: r.status,
        justification: r.justification,
        advisorRemarks: r.advisorRemarks,
        hodRemarks: r.hodRemarks,
        advisorDecision: r.advisorDecision,
        hodDecision: r.hodDecision,
        validations,
        studentId: r.studentId,
        advisorId: r.advisorId,
        departmentId: r.departmentId,
        batchId: r.batchId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
    }));

    res.status(200).json({
      status: 'success',
      data: { requests: detailedResults }
    });
  } catch (err) {
    next(err);
  }
};

// POST: HOD creates special permission (HOD only)
export const createHODSpecialPermission = async (req, res, next) => {
  try {
    const { studentId, courseCode, courseTitle, creditHours, justification, remarks } = req.body;

    if (!studentId || !courseCode || !courseTitle || !creditHours || !justification) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide student, course code, title, credits and justification.'
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found.'
      });
    }

    // Security check: Verify HOD is HOD of the student's department
    const isHOD = req.user.departmentIds && req.user.departmentIds.some(id => id.toString() === student.departmentId.toString());
    if (!isHOD) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not authorized for this student\'s department.'
      });
    }

    // Run business validations
    const validation = await validateApprovalRequest(studentId, courseCode, courseTitle, creditHours, 'special_permission');
    let prereqCheck = 'Passed';
    let isOverridden = false;
    let duplicateWarning = '';

    if (!validation.isValid) {
      if (validation.isFutureSemester) {
        return res.status(400).json({
          status: 'error',
          message: validation.reason
        });
      }

      if (validation.failureType === 'duplicate') {
        duplicateWarning = validation.reason;
      }

      const { overrideJustification } = req.body;
      // FE-21: Special permission overrides are strictly HOD-only. This route is
      // restrictTo('admin') at the router level (Dean has no Level-2 authority
      // per FE-20's "no Dean or other administrative roles" rule), so req.user
      // is always the HOD here.
      const canOverride = req.user.role === 'admin';

      if (canOverride && overrideJustification && overrideJustification.trim() !== '') {
        prereqCheck = 'Overridden';
        isOverridden = true;
      } else {
        return res.status(400).json({
          status: 'error',
          message: validation.reason
        });
      }
    }

    let isBacklog = false;
    const curriculum = await resolveCurriculumForStudent(student);
    if (curriculum) {
      const curriculumCourse = curriculum.courses.find(
        c => c.code.toUpperCase() === courseCode.toUpperCase()
      );
      if (curriculumCourse && curriculumCourse.semester < student.currentSemester) {
        isBacklog = true;
      }
    }

    // Lookup advisor of the batch
    const batch = await Batch.findById(student.batchId);
    const advisorId = batch && batch.advisorId ? batch.advisorId : req.user._id;

    const request = await ApprovalRequest.create({
      studentId,
      advisorId,
      departmentId: student.departmentId,
      batchId: student.batchId,
      courseCode: courseCode.trim().toUpperCase(),
      courseTitle: courseTitle.trim(),
      creditHours,
      requestType: 'special_permission',
      justification,
      status: 'special_granted',
      currentApproverRole: 'none',
      submittedBy: req.user._id,
      hodDecision: {
        decidedBy: req.user._id,
        decidedAt: new Date(),
        remarks: remarks ? remarks.trim() : 'Directly granted by HOD.'
      },
      hodRemarks: remarks ? remarks.trim() : 'Directly granted by HOD.',
      prereqCheck,
      duplicateWarning,
      overrideJustification: isOverridden ? req.body.overrideJustification.trim() : '',
      isBacklog
    });

    // Execute core action: Add course to student registration immediately
    student.courses.push({
      courseCode: courseCode.trim().toUpperCase(),
      courseTitle: courseTitle.trim(),
      creditHours,
      grade: 'IP',
      enrollmentStatus: 'enrolled',
      semester: student.currentSemester
    });
    await student.save();

    // Log audit
    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'REQUEST_SPECIAL_GRANTED',
      targetType: 'ApprovalRequest',
      targetId: request._id.toString(),
      departmentId: student.departmentId.toString(),
      batchId: student.batchId.toString(),
      metadata: { justification, remarks }
    });

    if (isOverridden) {
      await logAudit({
        actorId: req.user._id,
        actorRole: req.user.role,
        action: 'PREREQ_OVERRIDDEN',
        targetType: 'ApprovalRequest',
        targetId: request._id.toString(),
        departmentId: student.departmentId.toString(),
        batchId: student.batchId.toString(),
        metadata: {
          justification: req.body.overrideJustification.trim(),
          actor: req.user.name,
          timestamp: new Date()
        }
      });
    }

    // Notify Advisor. HOD and Advisor are always distinct accounts (each role
    // is its own User document, even under email-based "hat-switching" per the
    // Scope Doc), so a same-account check here would never actually trigger —
    // the batch's assigned advisor is always notified.
    if (advisorId) {
      await logNotification({
        recipientId: advisorId,
        recipientRole: 'advisor',
        type: 'info',
        message: `HOD granted special permission registration for student ${student.name} (${student.rollNumber}) in ${courseCode.trim().toUpperCase()}.`,
        departmentId: student.departmentId.toString(),
        batchId: student.batchId.toString()
      });
    }

    const populated = await ApprovalRequest.findById(request._id)
      .populate('studentId', 'name rollNumber cgpa currentSemester')
      .populate('advisorId', 'name email');

    res.status(201).json({
      status: 'success',
      data: { request: populated }
    });
  } catch (err) {
    next(err);
  }
};

// GET: list HOD pending approval requests
export const listHODPendingRequests = async (req, res, next) => {
  try {
    const departmentIds = req.user.departmentIds || [];
    if (departmentIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: { requests: [] }
      });
    }

    // Scoped: Pending HOD only
    const filter = {
      departmentId: { $in: departmentIds },
      status: 'advisor_approved'
    };

    const requests = await ApprovalRequest.find(filter)
      .populate('studentId', 'name rollNumber cgpa currentSemester')
      .populate('advisorId', 'name email')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { requests }
    });
  } catch (err) {
    next(err);
  }
};

// GET: list HOD request history (decided/finalized)
export const listHODHistory = async (req, res, next) => {
  try {
    const departmentIds = req.user.departmentIds || [];
    if (departmentIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: { history: [] }
      });
    }

    // Scoped: Decided / Finalized by HOD
    const filter = {
      departmentId: { $in: departmentIds },
      status: { $in: ['approved', 'rejected', 'special_granted'] }
    };

    const history = await ApprovalRequest.find(filter)
      .populate('studentId', 'name rollNumber cgpa currentSemester')
      .populate('advisorId', 'name email')
      .sort({ updatedAt: -1 });

    // Map `updatedAt` to `decidedAt` or `hodDecision.decidedAt` in mapper
    const mapped = history.map(r => {
      const decidedAt = r.hodDecision?.decidedAt || r.updatedAt;
      return {
        ...r.toObject(),
        decidedAt
      };
    });

    res.status(200).json({
      status: 'success',
      data: { history: mapped }
    });
  } catch (err) {
    next(err);
  }
};

// POST: HOD resolves decision (Approve / Reject)
export const resolveHODDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const isApprove = req.path.includes('approve');

    const request = await ApprovalRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Request not found.'
      });
    }

    // Security check
    const isHOD = req.user.departmentIds && req.user.departmentIds.some(did => did.toString() === request.departmentId.toString());
    if (!isHOD) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not authorized for this student\'s department.'
      });
    }

    if (request.status !== 'advisor_approved') {
      return res.status(400).json({
        status: 'error',
        message: 'Request is not currently pending HOD decision.'
      });
    }

    if (!isApprove && (!remarks || remarks.trim() === '')) {
      return res.status(400).json({
        status: 'error',
        message: 'Remarks are required when rejecting a request.'
      });
    }

    // Override authority (FR-4 / Module 4): if the request was flagged at submission
    // for a failed prerequisite/credit-hour/duplicate check, only the HOD (or Dean)
    // can approve it through, and only with a mandatory override justification.
    const { overrideJustification } = req.body;
    const isOverrideCase = isApprove && request.prereqCheck === 'Failed';
    if (isOverrideCase && (!overrideJustification || overrideJustification.trim() === '')) {
      return res.status(400).json({
        status: 'error',
        message: `This request failed automated validation (${request.validationFailureReason}). An override justification is required to approve it.`
      });
    }

    const student = await Student.findById(request.studentId);
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found.'
      });
    }

    if (isApprove) {
      request.status = 'approved';
      request.currentApproverRole = 'none';

      if (isOverrideCase) {
        request.prereqCheck = 'Overridden';
        request.overrideJustification = overrideJustification.trim();
      }

      // Perform course action adjustments based on request type. Special
      // permission requests submitted through the normal Advisor -> HOD chain
      // (FE-19/FR-4.3) are course-registration overrides, so they add the
      // course on HOD approval the same way a plain 'add' request does.
      if (request.requestType === 'add' || request.requestType === 'special_permission') {
        student.courses.push({
          courseCode: request.courseCode,
          courseTitle: request.courseTitle,
          creditHours: request.creditHours,
          grade: 'IP',
          enrollmentStatus: 'enrolled',
          semester: student.currentSemester
        });
      } else if (request.requestType === 'drop') {
        student.courses = student.courses.filter(
          c => c.courseCode.toUpperCase() !== request.courseCode.toUpperCase()
        );
      } else if (request.requestType === 'withdrawal') {
        // Find existing course and update grade to W
        const targetCourse = student.courses.find(
          c => c.courseCode.toUpperCase() === request.courseCode.toUpperCase()
        );
        if (targetCourse) {
          targetCourse.grade = 'W';
          // We keep enrollmentStatus standard, but the grade represents withdrawal
        }
      }

      await student.save();
    } else {
      request.status = 'rejected';
      request.currentApproverRole = 'none';
    }

    request.hodDecision = {
      decidedBy: req.user._id,
      decidedAt: new Date(),
      remarks: remarks ? remarks.trim() : ''
    };
    request.hodRemarks = remarks ? remarks.trim() : '';

    await request.save();

    // Log audit
    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: isApprove ? 'REQUEST_APPROVED_HOD' : 'REQUEST_REJECTED_HOD',
      targetType: 'ApprovalRequest',
      targetId: request._id.toString(),
      departmentId: request.departmentId.toString(),
      batchId: request.batchId.toString(),
      metadata: { remarks }
    });

    if (isOverrideCase) {
      await logAudit({
        actorId: req.user._id,
        actorRole: req.user.role,
        action: 'PREREQ_OVERRIDDEN',
        targetType: 'ApprovalRequest',
        targetId: request._id.toString(),
        departmentId: request.departmentId.toString(),
        batchId: request.batchId.toString(),
        metadata: {
          justification: overrideJustification.trim(),
          originalFailureReason: request.validationFailureReason,
          actor: req.user.name,
          timestamp: new Date()
        }
      });
    }

    // Notify Advisor
    if (request.advisorId) {
      await logNotification({
        recipientId: request.advisorId,
        recipientRole: 'advisor',
        type: isApprove ? 'info' : 'warning',
        message: `HOD has ${isApprove ? 'approved' : 'rejected'} the workflow request for student ${student.name} (${student.rollNumber}) in ${request.courseCode}.`,
        departmentId: request.departmentId.toString(),
        batchId: request.batchId.toString()
      });
    }

    const populated = await ApprovalRequest.findById(request._id)
      .populate('studentId', 'name rollNumber cgpa currentSemester')
      .populate('advisorId', 'name email');

    res.status(200).json({
      status: 'success',
      data: { request: populated }
    });
  } catch (err) {
    next(err);
  }
};

// GET: single request detail
export const getRequestDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await ApprovalRequest.findById(id)
      .populate('studentId', 'name rollNumber cgpa currentSemester')
      .populate('advisorId', 'name email');

    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Request not found.'
      });
    }

    // Access check: Advisor matches batch, or HOD matches department
    if (req.user.role === 'advisor') {
      const assignedBatches = req.user.assignedBatchIds || [];
      const hasAccess = assignedBatches.some(bid => bid.toString() === request.batchId.toString());
      if (!hasAccess) {
        return res.status(403).json({ status: 'error', message: 'Access denied.' });
      }
    } else if (req.user.role === 'admin') {
      const departmentIds = req.user.departmentIds || [];
      const hasAccess = departmentIds.some(did => did.toString() === request.departmentId.toString());
      if (!hasAccess) {
        return res.status(403).json({ status: 'error', message: 'Access denied.' });
      }
    }

    res.status(200).json({
      status: 'success',
      data: { request }
    });
  } catch (err) {
    next(err);
  }
};

// PUT: advisor revises a request that was returned_for_edit and resubmits it
// back into their own Level-1 queue as 'pending'. This is the consumer for the
// returned_for_edit state (Module 4 gap: previously routed to a nonexistent
// 'student' role with nothing able to act on it).
export const resubmitAdvisorRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { courseCode, courseTitle, creditHours, requestType, justification } = req.body;

    const request = await ApprovalRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Request not found.'
      });
    }

    // Security check: only the assigned advisor for this request's batch may resubmit it
    const assignedBatches = req.user.assignedBatchIds || [];
    const hasAccess = assignedBatches.some(bid => bid.toString() === request.batchId.toString());
    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not assigned to this student\'s batch.'
      });
    }

    if (request.status !== 'returned_for_edit') {
      return res.status(400).json({
        status: 'error',
        message: 'Only requests currently returned for edit can be resubmitted.'
      });
    }

    if (courseCode !== undefined) request.courseCode = courseCode.trim().toUpperCase();
    if (courseTitle !== undefined) request.courseTitle = courseTitle.trim();
    if (creditHours !== undefined) request.creditHours = creditHours;
    if (requestType !== undefined) request.requestType = requestType;
    if (justification !== undefined) request.justification = justification;

    // Re-run the same business validations a fresh submission would go through
    const validation = await validateApprovalRequest(
      request.studentId,
      request.courseCode,
      request.courseTitle,
      request.creditHours,
      request.requestType
    );

    if (!validation.isValid && validation.isFutureSemester) {
      return res.status(400).json({
        status: 'error',
        message: validation.reason
      });
    }

    request.prereqCheck = validation.isValid ? 'Passed' : 'Failed';
    request.validationFailureReason = validation.isValid ? '' : validation.reason;
    request.duplicateWarning = (!validation.isValid && validation.failureType === 'duplicate') ? validation.reason : '';
    request.overrideJustification = '';

    request.status = 'pending';
    request.currentApproverRole = 'advisor';
    request.advisorDecision = { decidedBy: undefined, decidedAt: undefined, remarks: '' };
    request.advisorRemarks = '';

    await request.save();

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'REQUEST_RESUBMITTED',
      targetType: 'ApprovalRequest',
      targetId: request._id.toString(),
      departmentId: request.departmentId.toString(),
      batchId: request.batchId.toString(),
      metadata: { description: 'Advisor revised and resubmitted a returned request.' }
    });

    const populated = await ApprovalRequest.findById(request._id)
      .populate('studentId', 'name rollNumber cgpa currentSemester')
      .populate('advisorId', 'name email');

    res.status(200).json({
      status: 'success',
      data: { request: populated }
    });
  } catch (err) {
    next(err);
  }
};

export const updateApprovalRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentName, rollNumber, justification, courseCode, courseTitle, creditHours, requestType } = req.body;

    const request = await ApprovalRequest.findById(id).populate('studentId');
    if (!request) {
      return res.status(404).json({ status: 'error', message: 'Request not found' });
    }

    if (justification !== undefined) request.justification = justification;
    if (courseCode !== undefined) request.courseCode = courseCode;
    if (courseTitle !== undefined) request.courseTitle = courseTitle;
    if (creditHours !== undefined) request.creditHours = creditHours;
    if (requestType !== undefined) request.requestType = requestType;

    await request.save();

    if (request.studentId && (studentName || rollNumber)) {
      const student = await Student.findById(request.studentId._id);
      if (student) {
        if (studentName) student.name = studentName;
        if (rollNumber) student.rollNumber = rollNumber;
        await student.save();
      }
    }

    res.status(200).json({ status: 'success', data: request });
  } catch (error) {
    next(error);
  }
};