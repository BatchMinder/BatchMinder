import express from 'express';
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../controllers/studentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(restrictTo('super_admin', 'academic_admin', 'admin', 'advisor'), getAllStudents)
  .post(restrictTo('super_admin', 'academic_admin'), createStudent);

router.route('/:id')
  .get(restrictTo('super_admin', 'academic_admin', 'admin', 'advisor'), getStudentById)
  .patch(restrictTo('super_admin', 'academic_admin'), updateStudent)
  .delete(restrictTo('super_admin', 'academic_admin'), deleteStudent);

export default router;
