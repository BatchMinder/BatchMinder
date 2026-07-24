import express from 'express';
import {
    generateStudentTranscript,
    generateBatchTranscripts,
    generateBatchSummaryReport,
    getReportHistory,
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/transcript/batch/:batchId', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), generateBatchTranscripts);
router.get('/transcript/:studentId', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), generateStudentTranscript);
router.post('/batch-summary', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), generateBatchSummaryReport);
router.get('/history', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getReportHistory);

export default router;
