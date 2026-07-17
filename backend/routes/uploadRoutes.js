import express from 'express';
import multer from 'multer';
import { validateUpload, importValidRows, getUploadHistory } from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

router.get('/', restrictTo('dean', 'academic_admin'), getUploadHistory);
router.post('/', restrictTo('dean', 'academic_admin'), upload.single('file'), validateUpload);
router.post('/:id/import', restrictTo('dean', 'academic_admin'), importValidRows);

export default router;
