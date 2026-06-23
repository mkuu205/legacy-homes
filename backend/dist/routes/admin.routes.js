"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../config/prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../utils/jwt");
const router = (0, express_1.Router)();
// Get all admin/staff users
router.get('/staff', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), async (req, res, next) => {
    try {
        const staff = await prisma_1.default.user.findMany({
            where: { role: 'SUPER_ADMIN' },
            select: { id: true, fullName: true, email: true, phone: true, role: true, accountStatus: true, createdAt: true },
        });
        res.json({ success: true, data: staff });
    }
    catch (error) {
        next(error);
    }
});
// Create staff user
router.post('/staff', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), async (req, res, next) => {
    try {
        const { fullName, email, phone, password, role } = req.body;
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const accountNumber = (0, jwt_1.generateAccountNumber)();
        const staff = await prisma_1.default.user.create({
            data: {
                fullName, email, phone, passwordHash,
                role: 'SUPER_ADMIN',
                accountStatus: 'ACTIVE',
                emailVerified: true,
                accountNumber,
            },
            select: { id: true, fullName: true, email: true, role: true },
        });
        res.status(201).json({ success: true, data: staff });
    }
    catch (error) {
        next(error);
    }
});
// Get audit logs
router.get('/audit-logs', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            prisma_1.default.auditLog.findMany({
                skip, take: limit,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { fullName: true, email: true, role: true } } },
            }),
            prisma_1.default.auditLog.count(),
        ]);
        res.json({ success: true, data: { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
    }
    catch (error) {
        next(error);
    }
});
// System settings
router.get('/settings', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), async (_req, res, next) => {
    try {
        const settings = await prisma_1.default.systemSetting.findMany({ where: { key: { not: { startsWith: 'reset_' } } } });
        res.json({ success: true, data: settings });
    }
    catch (error) {
        next(error);
    }
});
router.put('/settings', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), async (req, res, next) => {
    try {
        const { key, value } = req.body;
        const setting = await prisma_1.default.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
        res.json({ success: true, data: setting });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map