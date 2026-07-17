import express from 'express';
import { getAllBatches, getBatchById, createBatch, updateBatch, deleteBatch } from '../controllers/batchController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getAllBatches)
  .post(restrictTo('dean', 'academic_admin'), createBatch);

router.route('/:id')
  .get(restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getBatchById)
  .patch(restrictTo('dean', 'academic_admin'), updateBatch)
  .delete(restrictTo('dean', 'academic_admin'), deleteBatch);

export default router;
