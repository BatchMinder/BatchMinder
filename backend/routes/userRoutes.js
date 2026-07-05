import express from 'express';
import { getAllUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All routes require login
router.use(protect);

router.route('/')
  .get(getAllUsers)
  .post(restrictTo('super_admin', 'academic_admin'), createUser);

router.route('/:id')
  .patch(restrictTo('super_admin', 'academic_admin'), updateUser)
  .delete(restrictTo('super_admin', 'academic_admin'), deleteUser);

export default router;
