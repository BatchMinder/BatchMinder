import express from 'express';
import {
  getAllNotifications,
  createNotification,
  markBulkAsRead,
  markAsRead,
  markAllAsRead
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllNotifications)
  .post(createNotification);

router.route('/bulk-read')
  .patch(markBulkAsRead);

router.route('/mark-all-read')
  .patch(markAllAsRead);

router.route('/:id/read')
  .patch(markAsRead);

export default router;
