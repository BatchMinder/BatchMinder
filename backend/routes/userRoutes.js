import express from 'express';
import multer from 'multer';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  updateCurrentUserProfile,
  uploadProfilePicture,
  deleteProfilePicture
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

// Multer memory storage config with file type & size limits
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and WEBP images are allowed.'), false);
  }
};
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

const router = express.Router();

// All routes require login
router.use(protect);

router.route('/me')
  .patch(updateCurrentUserProfile);

router.route('/me/profile-picture')
  .post(upload.single('profilePicture'), uploadProfilePicture)
  .delete(deleteProfilePicture);

router.route('/')
  .get(getAllUsers)
  .post(restrictTo('super_admin', 'academic_admin'), createUser);

router.route('/:id')
  .patch(restrictTo('super_admin', 'academic_admin'), updateUser)
  .delete(restrictTo('super_admin', 'academic_admin'), deleteUser);

export default router;
