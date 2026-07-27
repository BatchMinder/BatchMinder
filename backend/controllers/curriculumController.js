import Curriculum from '../models/curriculum.js';
import Department from '../models/department.js';
import Batch from '../models/batch.js';
import { scopeToUserDepartments } from '../middleware/scopeMiddleware.js';
import { logAudit } from '../utils/logger.js';
import { buildCoursesForDept } from '../seedHECCurriculum.js';
import { resolveCurriculumForBatch } from '../utils/curriculumResolver.js';

// One Curriculum document per department. Every batch in that department —
// current or created later — follows it automatically. Admins are scoped to
// their own departmentId(s) via scopeToUserDepartments, so an AI admin can
// only see/edit the AI curriculum, an SE admin only SE's, etc. The `dean`
// role is unscoped and can see/edit all of them.

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

    // Main list view shows each department's CURRENT active version only.
    // Archived (older, batch-pinned) versions are available via
    // getCurriculumHistory for a given department if needed.
    const curriculums = await Curriculum.find({ ...scope, status: 'active' })
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', data: { curriculums } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Route stays "/batch/:batchId" for frontend compatibility. Returns whatever
// curriculum version this specific batch is pinned to — NOT necessarily the
// department's current active version, since publishing a new version
// doesn't move existing batches off what they started under.
export const getCurriculumByBatch = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(200).json({ status: 'success', data: { curriculum: null } });
    }

    const { batchId } = req.params;

    const batchDoc = await Batch.findById(batchId);
    if (!batchDoc) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    let curriculum = await resolveCurriculumForBatch(batchDoc);

    // Legacy safety net: if this batch was never pinned (e.g. created before
    // its department had a curriculum) and we just found one via fallback,
    // pin it now so future lookups don't need the fallback.
    if (curriculum && !batchDoc.curriculumId) {
      batchDoc.curriculumId = curriculum._id;
      await batchDoc.save();
    }

    if (curriculum) {
      curriculum = await curriculum.populate('departmentId', 'name code');
    }

    res.status(200).json({ status: 'success', data: { curriculum: curriculum || null } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// "SAVE CHANGES" — in-place edit of the department's CURRENT active
// curriculum (e.g. fixing a typo, adjusting a credit hour count). This does
// NOT create a new version and does NOT affect which batches are pinned to
// what — every batch already pointing at this active document sees the
// edit immediately, exactly as before. For an actual plan revision that
// should only affect new batches, use publishNewCurriculumVersion instead.
export const createOrUpdateCurriculum = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { departmentId, version, courses } = req.body;

    if (!departmentId || !courses) {
      return res.status(400).json({ message: 'Please provide departmentId and courses' });
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

    // Only ever mutate the ACTIVE document for this department — archived
    // (old, batch-pinned) versions must never be touched by an in-place save.
    const curriculum = await Curriculum.findOneAndUpdate(
      { departmentId, status: 'active' },
      { departmentId, version: version || '1.0', courses, status: 'active' },
      { new: true, upsert: true, runValidators: true }
    );

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'CURRICULUM_UPDATED',
      targetType: 'Curriculum',
      targetId: curriculum._id.toString(),
      departmentId: departmentId.toString(),
      metadata: { description: `Edited active curriculum for department ${departmentId} with ${courses.length} courses (in-place, no new version)` },
    });

    res.status(200).json({ status: 'success', data: { curriculum } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// "PUBLISH NEW VERSION" — a real curriculum revision. Archives the
// department's current active document (so batches already pinned to it
// keep working exactly as before, untouched) and creates a brand-new active
// document with the submitted courses. Only batches created AFTER this call
// will be pinned to the new version; existing batches are unaffected.
export const publishNewCurriculumVersion = async (req, res) => {
  try {
    const scope = scopeToUserDepartments(req);
    if (scope._id === null) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { departmentId, version, courses } = req.body;

    if (!departmentId || !courses || !version) {
      return res.status(400).json({ message: 'Please provide departmentId, version, and courses' });
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

    const existingVersion = await Curriculum.findOne({ departmentId, version });
    if (existingVersion) {
      return res.status(400).json({ message: `Version "${version}" already exists for this department — use a different version label` });
    }

    // 1. Archive whatever is currently active — this is what keeps every
    // batch already pinned to it working exactly as-is.
    await Curriculum.updateMany({ departmentId, status: 'active' }, { status: 'archived' });

    // 2. Create the new active version. Only NEW batches will get pinned to it.
    const newCurriculum = await Curriculum.create({
      departmentId,
      version,
      courses,
      status: 'active',
    });

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'CURRICULUM_VERSION_PUBLISHED',
      targetType: 'Curriculum',
      targetId: newCurriculum._id.toString(),
      departmentId: departmentId.toString(),
      metadata: { description: `Published curriculum version "${version}" for department ${departmentId} with ${courses.length} courses. Existing batches remain on their previous pinned version.` },
    });

    res.status(200).json({ status: 'success', data: { curriculum: newCurriculum } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Returns the OFFICIAL default HEC course list for a department, read
// directly from seedHECCurriculum.js's hecCurriculumsData (via
// buildCoursesForDept) — not from the database. This is the single source of
// truth for defaults, so it can never accidentally return another
// department's courses the way a loose DB query could. Used by the admin UI
// to initialize a brand-new department curriculum, or to offer a "reset to
// official HEC defaults" action.
export const getHECCurriculum = async (req, res) => {
  try {
    const { code, program, department } = req.query;
    const targetCode = (code || program || department || '').toUpperCase();

    if (!targetCode) {
      return res.status(400).json({ message: 'Please provide a department code (e.g. CS, AI, SE, CYS)' });
    }

    const built = buildCoursesForDept(targetCode);
    if (!built) {
      return res.status(404).json({ message: `No official HEC curriculum found for department code "${targetCode}"` });
    }

    res.status(200).json({
      status: 'success',
      data: {
        curriculum: {
          departmentCode: built.prog.deptCode,
          departmentName: built.prog.deptName,
          version: built.prog.version,
          totalRequiredCredits: built.totalCH,
          courses: built.courses,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Returns every version (active + archived) ever published for a
// department, newest first — so admin can see what changed and when.
export const getCurriculumHistory = async (req, res) => {
  try {
    const { batchId } = req.params;
    const batchDoc = await Batch.findById(batchId);
    if (!batchDoc || !batchDoc.departmentId) {
      return res.status(200).json({ status: 'success', data: { history: [] } });
    }

    const history = await Curriculum.find({ departmentId: batchDoc.departmentId })
      .select('version status createdAt courses')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        history: history.map(h => ({
          _id: h._id,
          version: h.version,
          status: h.status,
          createdAt: h.createdAt,
          courseCount: h.courses.length,
          isCurrentlyPinnedToThisBatch: batchDoc.curriculumId?.toString() === h._id.toString(),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
