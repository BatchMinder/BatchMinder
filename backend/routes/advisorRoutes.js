import express from 'express';
import { getDashboardSummary, getStudents, getStudentById, getStudentEligibleCourses } from '../controllers/advisorController.js';
import {
  listAdvisorRequests,
  createAdvisorRequest,
  resolveAdvisorDecision,
  getRequestDetails
} from '../controllers/approvalRequestController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('advisor', 'super_admin'));

// Student profile lists and details
router.get('/dashboard-summary', getDashboardSummary);
router.get('/students', getStudents);
router.get('/students/:id', getStudentById);
router.get('/students/:id/eligible-courses', getStudentEligibleCourses);

// Workflow requests management (Advisor role)
router.get('/requests', listAdvisorRequests);
router.post('/requests', createAdvisorRequest);
router.post('/approve/:id', resolveAdvisorDecision);
router.post('/reject/:id', resolveAdvisorDecision);
router.get('/requests/:id', getRequestDetails);

export default router;
