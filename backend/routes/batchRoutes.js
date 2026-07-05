import express from 'express';
import { getAllBatches, createBatch, updateBatch, deleteBatch } from '../controllers/batchController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllBatches)
  .post(restrictTo('super_admin', 'academic_admin'), createBatch);

router.route('/:id')
  .patch(restrictTo('super_admin', 'academic_admin'), updateBatch)
  .delete(restrictTo('super_admin', 'academic_admin'), deleteBatch);

export default router;
