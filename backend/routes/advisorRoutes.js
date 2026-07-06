import express from 'express';
import { getDashboardSummary, getStudents, getStudentById } from '../controllers/advisorController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('advisor'));

router.get('/dashboard-summary', getDashboardSummary);
router.get('/students', getStudents);
router.get('/students/:id', getStudentById);

export default router;
