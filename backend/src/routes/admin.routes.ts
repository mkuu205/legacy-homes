import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { generateAccountNumber } from '../utils/jwt';

const router = Router();

// Get all admin/staff users
router.get('/staff', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const staff = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true, fullName: true, email: true, phone: true, role: true, accountStatus: true, createdAt: true },
    });
    res.json({ success: true, data: staff });
  } catch (error) { next(error); }
});

// Create staff user
router.post('/staff', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fullName, email, phone, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);
    const accountNumber = generateAccountNumber();

    const staff = await prisma.user.create({
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
  } catch (error) { next(error); }
});

// Get audit logs
router.get('/audit-logs', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, email: true, role: true } } },
      }),
      prisma.auditLog.count(),
    ]);

    res.json({ success: true, data: { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
});

// System settings
router.get('/settings', authenticate, authorize('SUPER_ADMIN'), async (_req, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.systemSetting.findMany({ where: { key: { not: { startsWith: 'reset_' } } } });
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
});

router.put('/settings', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key, value } = req.body;
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    res.json({ success: true, data: setting });
  } catch (error) { next(error); }
});

export default router;
