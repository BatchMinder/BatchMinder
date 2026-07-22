import express from 'express';
import {
  listHODPendingRequests,
  listHODHistory,
  createHODSpecialPermission,
  resolveHODDecision,
  getRequestDetails
} from '../controllers/approvalRequestController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin')); // Strictly HOD role (admin)

router.get('/requests', listHODPendingRequests);
router.get('/history', listHODHistory);
router.post('/special-permission', createHODSpecialPermission);
router.post('/approve/:id', resolveHODDecision);
router.post('/reject/:id', resolveHODDecision);
router.get('/requests/:id', getRequestDetails);

export default router;
