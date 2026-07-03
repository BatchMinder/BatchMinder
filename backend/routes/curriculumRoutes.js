import express from 'express';
import { getCurriculumMap, createOrUpdateCurriculumMap } from '../controllers/curriculumController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Both advisors and admins can get curriculum maps
router.get('/', protect, getCurriculumMap);

// Only admins can upload/modify curriculum structures
router.post('/', protect, restrictTo('admin'), createOrUpdateCurriculumMap);

export default router;
