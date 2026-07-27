import express from 'express';
import { getDashboardSummary, getStudents, getStudentById, getStudentEligibleCourses } from '../controllers/advisorController.js';
import {
  listAdvisorRequests,
  createAdvisorRequest,
  resolveAdvisorDecision,
  getRequestDetails,
  resubmitAdvisorRequest
} from '../controllers/approvalRequestController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';


const router = express.Router();

router.use(protect);
// Level-1 approval actions are strictly Advisor-only (FE-20 / FR-4.1: "Advisor →
// HOD workflow" — no other role, including Dean, participates in Level-1 or
// Level-2 decisions).
router.use(restrictTo('advisor'));

// Student profile lists and details
router.get('/dashboard-summary', getDashboardSummary);
router.get('/students', getStudents);
router.get('/students/:id', getStudentById);
router.get('/students/:id/eligible-courses', getStudentEligibleCourses);

// Workflow requests management (Advisor role)
router.get('/requests', listAdvisorRequests);
router.post('/requests', createAdvisorRequest);
router.put('/requests/:id/resubmit', resubmitAdvisorRequest);
router.post('/approve/:id', resolveAdvisorDecision);
router.post('/reject/:id', resolveAdvisorDecision);
router.get('/requests/:id', getRequestDetails);

export default router;