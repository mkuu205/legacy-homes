"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const support_controller_1 = require("../controllers/support.controller");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: '/tmp/uploads/', limits: { fileSize: 10 * 1024 * 1024 } });
// Resident routes
router.post('/', auth_1.authenticate, upload.array('attachments', 5), support_controller_1.supportController.createTicket.bind(support_controller_1.supportController));
router.get('/my-tickets', auth_1.authenticate, support_controller_1.supportController.getMyTickets.bind(support_controller_1.supportController));
router.post('/:id/reply', auth_1.authenticate, upload.array('attachments', 5), support_controller_1.supportController.reply.bind(support_controller_1.supportController));
router.get('/:id', auth_1.authenticate, support_controller_1.supportController.getById.bind(support_controller_1.supportController));
// Admin routes
router.get('/stats/overview', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), support_controller_1.supportController.getStats.bind(support_controller_1.supportController));
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), support_controller_1.supportController.getAll.bind(support_controller_1.supportController));
router.patch('/:id/status', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), support_controller_1.supportController.updateStatus.bind(support_controller_1.supportController));
exports.default = router;
//# sourceMappingURL=support.routes.js.map