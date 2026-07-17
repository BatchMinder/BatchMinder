import express from 'express';
import { getCurriculumByBatch, createOrUpdateCurriculum, getAllCurriculums } from '../controllers/curriculumController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', restrictTo('dean', 'academic_admin', 'admin'), getAllCurriculums);
router.get('/batch/:batchId', restrictTo('dean', 'academic_admin', 'admin'), getCurriculumByBatch);
router.post('/', restrictTo('dean', 'academic_admin'), createOrUpdateCurriculum);

export default router;
