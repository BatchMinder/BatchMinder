import express from 'express';
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkUploadStudents,
  syncLmsRecords,
  promoteSemester,
  getStudentDegreeProgress
} from '../controllers/studentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

router.post('/upload', restrictTo('dean', 'academic_admin'), upload.single('file'), bulkUploadStudents);
router.post('/sync-lms', restrictTo('dean', 'academic_admin'), syncLmsRecords);
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
