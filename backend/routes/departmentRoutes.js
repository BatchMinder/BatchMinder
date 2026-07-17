import express from 'express';
import {
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departmentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getAllDepartments)
  .post(restrictTo('dean'), createDepartment);

router.route('/:id')
  .patch(restrictTo('dean'), updateDepartment)
  .delete(restrictTo('dean'), deleteDepartment);

export default router;
