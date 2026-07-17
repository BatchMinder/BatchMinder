import express from 'express';
import { register, login, logout, getMe, checkEmail, setupDean } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';
import { rateLimit } from '../utils/rateLimiter.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
// Rate-limited: without this, checkEmail can be hammered to enumerate which
// emails/role combos exist in the system.
router.get('/check-email', rateLimit(20, 5 * 60 * 1000), checkEmail);
router.post('/setup-dean', setupDean);
router.get('/me', protect, getMe);

export default router;