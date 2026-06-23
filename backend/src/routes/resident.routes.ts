import { Router } from 'express';
import { residentController } from '../controllers/resident.controller';
import { authenticate, authorize } from '../middleware/auth';
import multer from 'multer';
import path from 'path';

const router = Router();

const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Resident self-service routes
router.get('/dashboard', authenticate, residentController.getDashboard.bind(residentController));
router.put('/profile', authenticate, residentController.updateProfile.bind(residentController));
router.post('/profile/picture', authenticate, upload.single('profilePicture'), residentController.updateProfilePicture.bind(residentController));
router.put('/change-password', authenticate, residentController.changePassword.bind(residentController));

// Admin routes
router.get('/export/csv', authenticate, authorize('SUPER_ADMIN'), residentController.exportCSV.bind(residentController));
router.get('/', authenticate, authorize('SUPER_ADMIN'), residentController.getAll.bind(residentController));
router.post('/', authenticate, authorize('SUPER_ADMIN'), residentController.create.bind(residentController));
router.get('/:id', authenticate, authorize('SUPER_ADMIN'), residentController.getById.bind(residentController));
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), residentController.update.bind(residentController));
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN'), residentController.updateStatus.bind(residentController));
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), residentController.delete.bind(residentController));
router.post('/:id/reset-password', authenticate, authorize('SUPER_ADMIN'), residentController.adminResetPassword.bind(residentController));

export default router;
