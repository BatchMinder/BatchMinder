import express from 'express';
import { register, login, logout, getMe, getAuditLogs, checkEmail } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/check-email', checkEmail);
router.get('/me', protect, getMe);
router.get('/audit-logs', protect, restrictTo('admin', 'advisor'), getAuditLogs);

export default router;
