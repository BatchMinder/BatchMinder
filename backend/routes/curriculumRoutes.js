import express from 'express';
import { getCurriculumByBatch, createOrUpdateCurriculum } from '../controllers/curriculumController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/batch/:batchId', restrictTo('super_admin', 'academic_admin', 'admin'), getCurriculumByBatch);
router.post('/', restrictTo('super_admin', 'academic_admin'), createOrUpdateCurriculum);

export default router;
