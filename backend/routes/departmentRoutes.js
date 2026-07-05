import express from 'express';
import { getAllDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/departmentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllDepartments)
  .post(restrictTo('super_admin', 'academic_admin'), createDepartment);

router.route('/:id')
  .patch(restrictTo('super_admin', 'academic_admin'), updateDepartment)
  .delete(restrictTo('super_admin', 'academic_admin'), deleteDepartment);

export default router;
