import express from 'express';
import { getAllBatches, getBatchById, createBatch, updateBatch, deleteBatch } from '../controllers/batchController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getAllBatches)
  .post(restrictTo('dean'), createBatch);

router.route('/:id')
  .get(restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getBatchById)
  .patch(restrictTo('dean'), updateBatch)
  .delete(restrictTo('dean'), deleteBatch);


export default router;
