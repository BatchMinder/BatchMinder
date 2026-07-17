import express from 'express';
import multer from 'multer';
import { getAllMigrations, createMigration, decideMigration, updateMigration, uploadTranscript, parseTranscript } from '../controllers/migrationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.use(protect);

router.route('/')
  .get(restrictTo('super_admin', 'academic_admin', 'admin'), getAllMigrations)
  .post(restrictTo('super_admin', 'academic_admin'), createMigration);

router.route('/:id')
  .patch(restrictTo('super_admin', 'academic_admin'), updateMigration);

router.post('/:id/decide', restrictTo('super_admin', 'academic_admin'), decideMigration);
router.post('/:id/transcript', restrictTo('super_admin', 'academic_admin'), upload.single('transcript'), uploadTranscript);
router.get('/:id/parse-transcript', restrictTo('super_admin', 'academic_admin'), parseTranscript);

export default router;
