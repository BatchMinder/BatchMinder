import express from 'express';
import multer from 'multer';
import {
  getAllMigrations,
  createMigration,
  decideMigration,
  updateMigration,
  uploadTranscript,
  uploadDecisionSheet,
  parseDecisionSheet,
  downloadTranscript,
  downloadDecisionSheet,
} from '../controllers/migrationController.js';
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
router.get('/:id/parse-decision-sheet', restrictTo('dean', 'academic_admin'), parseDecisionSheet);

// Same-origin download routes. These stream the file back through our own
// backend with an explicit Content-Disposition header, so the browser always
// saves it with the correct filename/extension — a direct Cloudinary link
// can't guarantee this: the HTML `download="..."` attribute is silently
// ignored by browsers for cross-origin URLs, and any file uploaded before
// the format-extension fix has no extension in its Cloudinary URL at all.
router.get('/:id/transcript/download', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), downloadTranscript);
router.get('/:id/decision-sheet/download', restrictTo('dean', 'academic_admin', 'admin', 'advisor'), downloadDecisionSheet);

export default router;