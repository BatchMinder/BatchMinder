import Curriculum from '../models/curriculum.js';

// Resolves the correct curriculum for a batch:
// 1. If the batch is pinned to a specific curriculum version (curriculumId),
//    use that — even if a newer version has since been published for the
//    department. This is what keeps existing batches on the plan they
//    actually started under.
// 2. If the batch was never pinned (legacy data, or created before a
//    department had any curriculum), fall back to the department's
//    currently active version.
//
// Accepts either a populated Batch document or a plain { curriculumId,
// departmentId } shape.
export async function resolveCurriculumForBatch(batch) {
  if (!batch) return null;

  if (batch.curriculumId) {
    const pinned = await Curriculum.findById(batch.curriculumId);
    if (pinned) return pinned;
  }

  if (batch.departmentId) {
    return Curriculum.findOne({
      departmentId: batch.departmentId._id || batch.departmentId,
      status: 'active',
    });
  }

  return null;
}

// Convenience version for when you only have a departmentId + batchId handy
// (avoids callers needing to import Batch everywhere).
export async function resolveCurriculumForStudent(student) {
  if (!student) return null;
  const Batch = (await import('../models/batch.js')).default;
  const batchId = student.batchId?._id || student.batchId;
  if (batchId) {
    const batchDoc = await Batch.findById(batchId);
    if (batchDoc) return resolveCurriculumForBatch(batchDoc);
  }
  // No batch at all — fall back to department's active version
  if (student.departmentId) {
    return Curriculum.findOne({
      departmentId: student.departmentId._id || student.departmentId,
      status: 'active',
    });
  }
  return null;
}
