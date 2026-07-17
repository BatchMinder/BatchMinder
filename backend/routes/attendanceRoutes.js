import express from 'express';
import { getAttendanceRoster, updateAttendance, getLowAttendanceReport, getBatchCourses } from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/courses', restrictTo('advisor', 'academic_admin', 'dean'), getBatchCourses);
router.get('/', restrictTo('advisor', 'academic_admin', 'dean'), getAttendanceRoster);
router.put('/', restrictTo('advisor', 'academic_admin', 'dean'), updateAttendance);
router.get('/report', restrictTo('advisor', 'academic_admin', 'dean'), getLowAttendanceReport);

export default router;
