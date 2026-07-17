import express from 'express';
import {
  getDashboardStats,
  getCgpaDistribution,
  getStudentsByBatch,
  getAtRiskTrend,
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/stats', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getDashboardStats);
router.get('/cgpa-distribution', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getCgpaDistribution);
router.get('/students-by-batch', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getStudentsByBatch);
router.get('/at-risk-trend', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getAtRiskTrend);

export default router;
