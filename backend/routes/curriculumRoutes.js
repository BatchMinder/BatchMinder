import express from 'express';
import multer from 'multer';
import { getCurriculumByBatch, createOrUpdateCurriculum, getAllCurriculums, getHECCurriculum } from '../controllers/curriculumController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.get('/hec', restrictTo('super_admin', 'academic_admin', 'admin'), getHECCurriculum);

router.get('/', restrictTo('super_admin', 'academic_admin', 'admin', 'advisor'), getAllCurriculums);
router.get('/batch/:batchId', restrictTo('super_admin', 'academic_admin', 'admin', 'advisor'), getCurriculumByBatch);
router.post('/', restrictTo('super_admin', 'academic_admin'), createOrUpdateCurriculum);

export default router;
