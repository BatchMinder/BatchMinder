import express from 'express';
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  predictStudentRisk,
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

router.post('/upload', restrictTo('super_admin', 'academic_admin'), upload.single('file'), bulkUploadStudents);
router.post('/sync-lms', restrictTo('super_admin', 'academic_admin'), syncLmsRecords);
router.post('/promote-semester', restrictTo('super_admin', 'academic_admin'), promoteSemester);

router.route('/')
  .get(restrictTo('super_admin', 'academic_admin', 'admin', 'advisor'), getAllStudents)
  .post(restrictTo('super_admin', 'academic_admin'), createStudent);

router.route('/:id')
  .get(restrictTo('super_admin', 'academic_admin', 'admin', 'advisor'), getStudentById)
  .patch(restrictTo('super_admin', 'academic_admin'), updateStudent)
  .delete(restrictTo('super_admin', 'academic_admin'), deleteStudent);

router.get('/:id/degree-progress', restrictTo('super_admin', 'academic_admin', 'admin', 'advisor'), getStudentDegreeProgress);
router.post('/:id/predict-risk', restrictTo('super_admin', 'academic_admin', 'admin', 'advisor'), predictStudentRisk);

export default router;
