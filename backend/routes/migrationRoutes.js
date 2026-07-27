import express from 'express';
import multer from 'multer';
import { getAllMigrations, createMigration, decideMigration, updateMigration, uploadTranscript, uploadDecisionSheet, parseTranscript } from '../controllers/migrationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.use(protect);

router.route('/')
  .get(restrictTo('dean', 'academic_admin', 'admin', 'advisor'), getAllMigrations)
  .post(restrictTo('dean', 'academic_admin'), createMigration);

router.route('/:id')
  .patch(restrictTo('dean', 'academic_admin'), updateMigration);

router.post('/:id/decide', restrictTo('dean', 'academic_admin'), decideMigration);
router.post('/:id/transcript', restrictTo('dean', 'academic_admin'), upload.single('transcript'), uploadTranscript);
router.post('/:id/decision-sheet', restrictTo('dean', 'academic_admin'), upload.single('decisionSheet'), uploadDecisionSheet);
router.get('/:id/parse-transcript', restrictTo('dean', 'academic_admin'), parseTranscript);

export default router;
