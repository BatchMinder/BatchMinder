import express from 'express';
import multer from 'multer';
import { getCurriculumByBatch, createOrUpdateCurriculum, publishNewCurriculumVersion, createOrUpdateCurriculumMap, getAllCurriculums, getHECCurriculum, getCurriculumHistory } from '../controllers/curriculumController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.get('/hec', restrictTo('dean', 'academic_admin', 'admin'), getHECCurriculum);

router.get('/', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getAllCurriculums);
router.get('/batch/:batchId', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getCurriculumByBatch);
router.get('/batch/:batchId/history', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getCurriculumHistory);
router.post('/', restrictTo('dean', 'academic_admin'), createOrUpdateCurriculum);
router.post('/publish-version', restrictTo('dean', 'academic_admin'), publishNewCurriculumVersion);
router.post('/map', restrictTo('dean', 'academic_admin'), createOrUpdateCurriculumMap);

export default router;