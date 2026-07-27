import express from 'express';
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  promoteSemester,
  getStudentDegreeProgress
} from '../controllers/studentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

// NOTE: bulk CSV/Excel student upload lives at POST /api/uploads +
// POST /api/uploads/:id/import (see uploadController.js /
// uploadRoutes.js) — that's the endpoint DataIngestionHub.jsx actually
// calls. A second, unused '/upload' route + bulkUploadStudents()
// controller function used to live here too; it was never called from
// the frontend, so it's been removed to avoid two parallel upload
// implementations drifting out of sync with each other.

router.post('/promote-semester', restrictTo('dean', 'academic_admin'), promoteSemester);

router.route('/')
  .get(restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getAllStudents)
  .post(restrictTo('dean', 'academic_admin'), createStudent);

router.route('/:id')
  .get(restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getStudentById)
  .patch(restrictTo('dean', 'academic_admin'), updateStudent)
  .delete(restrictTo('dean', 'academic_admin'), deleteStudent);

router.get('/:id/degree-progress', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getStudentDegreeProgress);

export default router;