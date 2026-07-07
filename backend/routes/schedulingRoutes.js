import express from 'express';
import {
  getTimetable,
  saveTimetable,
  getDatesheet,
  saveDatesheet,
  saveOverride
} from '../controllers/schedulingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

// Read schedules is accessible by all authenticated roles (Advisors, HODs, Admins)
router.get('/timetable', getTimetable);
router.get('/datesheet', getDatesheet);

// Writing/Mutating schedules requires academic admin or super admin privileges
router.post('/timetable', restrictTo('academic_admin', 'super_admin'), saveTimetable);
router.post('/datesheet', restrictTo('academic_admin', 'super_admin'), saveDatesheet);
router.post('/override', restrictTo('academic_admin', 'super_admin'), saveOverride);

export default router;
