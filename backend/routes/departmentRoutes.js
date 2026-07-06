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
  .get(restrictTo('super_admin', 'academic_admin', 'admin', 'advisor'), getAllDepartments)
  .post(restrictTo('super_admin'), createDepartment);

router.route('/:id')
  .patch(restrictTo('super_admin'), updateDepartment)
  .delete(restrictTo('super_admin'), deleteDepartment);

export default router;
