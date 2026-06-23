"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resident_controller_1 = require("../controllers/resident.controller");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    dest: '/tmp/uploads/',
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext))
            cb(null, true);
        else
            cb(new Error('Only image files are allowed'));
    },
});
// Resident self-service routes
router.get('/dashboard', auth_1.authenticate, resident_controller_1.residentController.getDashboard.bind(resident_controller_1.residentController));
router.put('/profile', auth_1.authenticate, resident_controller_1.residentController.updateProfile.bind(resident_controller_1.residentController));
router.post('/profile/picture', auth_1.authenticate, upload.single('profilePicture'), resident_controller_1.residentController.updateProfilePicture.bind(resident_controller_1.residentController));
router.put('/change-password', auth_1.authenticate, resident_controller_1.residentController.changePassword.bind(resident_controller_1.residentController));
// Admin routes
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), resident_controller_1.residentController.getAll.bind(resident_controller_1.residentController));
router.get('/:id', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), resident_controller_1.residentController.getById.bind(resident_controller_1.residentController));
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), resident_controller_1.residentController.update.bind(resident_controller_1.residentController));
router.patch('/:id/status', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), resident_controller_1.residentController.updateStatus.bind(resident_controller_1.residentController));
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), resident_controller_1.residentController.delete.bind(resident_controller_1.residentController));
router.post('/:id/reset-password', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), resident_controller_1.residentController.adminResetPassword.bind(resident_controller_1.residentController));
exports.default = router;
//# sourceMappingURL=resident.routes.js.map