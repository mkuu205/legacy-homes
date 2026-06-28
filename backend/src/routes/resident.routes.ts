import { Router } from 'express';
import multer from 'multer';
import { residentController } from '../controllers/resident.controller';
import { authenticate, authorize } from '../middleware/auth';

const router: import('express').Router = Router();

// ── Profile picture upload ──────────────────────────────────────────────────
// Use memoryStorage so we do NOT depend on a writable disk on the Railway
// container. The old `dest: '/tmp/uploads/'` was the root cause of HTTP 500
// for /api/residents/profile/picture: multer threw `ENOENT` when the dir
// didn't exist, which surfaced as a 500 before our handler even ran.
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype.toLowerCase())) cb(null, true);
    else cb(new Error(`Unsupported image type: ${file.mimetype}. Allowed: JPG, PNG, WEBP`));
  },
});

// Wrap multer so MulterError / fileFilter rejections become 400, not 500.
const profilePictureUpload: import('express').RequestHandler = (req, res, next) => {
  upload.single('profilePicture')(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const map: Record<string, string> = {
        LIMIT_FILE_SIZE: 'Image is too large (max 5MB).',
        LIMIT_UNEXPECTED_FILE: 'Use the field name "profilePicture".',
      };
      return res.status(400).json({ success: false, message: map[err.code] || err.message });
    }
    const message = err instanceof Error ? err.message : 'Upload failed';
    return res.status(400).json({ success: false, message });
  });
};

// Resident self-service routes
router.get('/dashboard', authenticate, residentController.getDashboard.bind(residentController));
router.put('/profile', authenticate, residentController.updateProfile.bind(residentController));
router.post(
  '/profile/picture',
  authenticate,
  profilePictureUpload,
  residentController.updateProfilePicture.bind(residentController),
);
router.put('/change-password', authenticate, residentController.changePassword.bind(residentController));

// Admin routes (unchanged)
router.get('/export/csv', authenticate, authorize('SUPER_ADMIN'), residentController.exportCSV.bind(residentController));
router.get('/', authenticate, authorize('SUPER_ADMIN'), residentController.getAll.bind(residentController));
router.post('/', authenticate, authorize('SUPER_ADMIN'), residentController.create.bind(residentController));
router.get('/:id', authenticate, authorize('SUPER_ADMIN'), residentController.getById.bind(residentController));
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), residentController.update.bind(residentController));
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN'), residentController.updateStatus.bind(residentController));
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), residentController.delete.bind(residentController));
router.post('/:id/reset-password', authenticate, authorize('SUPER_ADMIN'), residentController.adminResetPassword.bind(residentController));

export default router;
