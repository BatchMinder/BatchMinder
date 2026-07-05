import express from 'express';
import { register, login, logout, getMe, getAuditLogs, checkEmail, setupSuperAdmin } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/check-email', checkEmail);
router.post('/setup-super-admin', setupSuperAdmin);
router.get('/me', protect, getMe);
router.get('/audit-logs', protect, getAuditLogs);

export default router;
