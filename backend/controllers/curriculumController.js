import Curriculum from '../models/curriculum.js';
import AuditLog from '../models/auditLog.js';

// Helper to log audit actions
const logAudit = async (userId, userEmail, action, description) => {
  try {
    await AuditLog.create({
      userId,
      userEmail,
      action,
      description,
    });
  } catch (err) {
    console.error('Audit logging failed inside curriculumController:', err);
  }
};

export const getCurriculumMap = async (req, res) => {
  try {
    const { department, batch, semester } = req.query;
    
    if (!department || !batch) {
      return res.status(400).json({ message: 'Please provide department and batch parameters' });
    }

    const query = { department, batch };
    if (semester) {
      query.semester = Number(semester);
    }

    const curriculum = await Curriculum.find(query);
    
    res.status(200).json({
      status: 'success',
      results: curriculum.length,
      data: {
        curriculum,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createOrUpdateCurriculumMap = async (req, res) => {
  try {
    const { department, batch, semester, courses } = req.body;

    if (!department || !batch || !semester || !courses || !Array.isArray(courses)) {
      return res.status(400).json({ message: 'Please provide department, batch, semester, and courses array' });
    }

    // Upsert the curriculum maps
    const curriculum = await Curriculum.findOneAndUpdate(
      { department, batch, semester: Number(semester) },
      { department, batch, semester: Number(semester), courses },
      { new: true, upsert: true, runValidators: true }
    );

    // Log this action to the audit logs
    const updaterEmail = req.user ? req.user.email : 'system@batchminder.local';
    const updaterId = req.user ? req.user._id : null;
    await logAudit(
      updaterId,
      updaterEmail,
      'CURRICULUM_UPDATED',
      `Updated course curriculum map for ${department} - Batch ${batch} (Semester ${semester}) containing ${courses.length} courses.`
    );

    res.status(200).json({
      status: 'success',
      data: {
        curriculum,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
