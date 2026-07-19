import express from 'express';
import { register, login, logout, getMe, checkEmail, setupDean, forgotPassword, resetPassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';
import { rateLimit } from '../utils/rateLimiter.js';

const router = express.Router();

// Not used by the frontend (account creation goes through POST /users, which
// is already restrictTo('dean','academic_admin')). Left in place as a
// dean-only utility, but must never be reachable unauthenticated — an open
// /register that accepts `role` from the body would let anyone mint a
// 'dean' account.
router.post('/register', protect, restrictTo('dean'), register);
router.post('/login', login);
router.post('/logout', logout);
// Rate-limited: without this, checkEmail can be hammered to enumerate which
// emails/role combos exist in the system.
router.get('/check-email', rateLimit(20, 5 * 60 * 1000), checkEmail);
router.post('/setup-dean', setupDean);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

export default router;