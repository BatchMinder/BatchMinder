import express from 'express';
import multer from 'multer';
import { 
  getAllStudents, 
  getStudentById, 
  createStudent, 
  updateStudent, 
  deleteStudent, 
  bulkUploadStudents,
  syncLmsRecords,
  promoteSemester
} from '../controllers/studentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Setup Multer for memory buffers upload parsing
const upload = multer({ storage: multer.memoryStorage() });

// Authenticate all routes
router.use(protect);

// Student profile management endpoints
router.get('/', restrictTo('admin', 'advisor'), getAllStudents);
router.get('/:id', restrictTo('admin', 'advisor'), getStudentById);
router.post('/', restrictTo('admin'), createStudent);
router.put('/:id', restrictTo('admin', 'advisor'), updateStudent);
router.delete('/:id', restrictTo('admin'), deleteStudent);

// Data Ingestion, LMS Sync, and Batch Migrations
router.post('/upload', restrictTo('admin', 'advisor'), upload.single('file'), bulkUploadStudents);
router.post('/sync-lms', restrictTo('admin', 'advisor'), syncLmsRecords);
router.post('/promote-batch', restrictTo('admin'), promoteSemester);

export default router;
