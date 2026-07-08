import express from 'express';
import { getAttendanceRoster, updateAttendance, getLowAttendanceReport, getBatchCourses } from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/courses', restrictTo('advisor', 'academic_admin', 'super_admin'), getBatchCourses);
router.get('/', restrictTo('advisor', 'academic_admin', 'super_admin'), getAttendanceRoster);
router.put('/', restrictTo('advisor', 'academic_admin', 'super_admin'), updateAttendance);
router.get('/report', restrictTo('advisor', 'academic_admin', 'super_admin'), getLowAttendanceReport);

export default router;
