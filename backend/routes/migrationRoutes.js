import express from 'express';
import { getAllMigrations, createMigration, decideMigration, updateMigration } from '../controllers/migrationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(restrictTo('super_admin', 'academic_admin', 'admin'), getAllMigrations)
  .post(restrictTo('super_admin', 'academic_admin'), createMigration);

router.route('/:id')
  .patch(restrictTo('super_admin', 'academic_admin'), updateMigration);

router.post('/:id/decide', restrictTo('super_admin', 'academic_admin'), decideMigration);

export default router;
