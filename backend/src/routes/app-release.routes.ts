import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { uploadRawBufferToCloudinary } from '../utils/cloudinary';
import { notificationService } from '../services/notification.service';

const router: import('express').Router = Router();
const apkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const extension = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (extension === '.apk' && ['application/vnd.android.package-archive', 'application/octet-stream', 'application/zip'].includes(file.mimetype.toLowerCase())) {
      cb(null, true);
      return;
    }
    cb(new Error('Only Android APK files are accepted'));
  },
});

const parseVersionCode = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new AppError('versionCode must be a positive integer', 400);
  return parsed;
};

const getMaintenance = async () => {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ['APP_MAINTENANCE_ENABLED', 'APP_MAINTENANCE_MESSAGE'] } },
    select: { key: true, value: true },
  });
  const map = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
  return {
    enabled: map.APP_MAINTENANCE_ENABLED === 'true',
    message: map.APP_MAINTENANCE_MESSAGE || null,
  };
};

const currentRelease = () => prisma.appRelease.findFirst({
  where: { platform: 'ANDROID', status: 'PUBLISHED' },
  orderBy: [{ versionCode: 'desc' }, { publishedAt: 'desc' }],
  select: {
    id: true, platform: true, versionName: true, versionCode: true, releaseNotes: true,
    downloadUrl: true, fileName: true, fileSizeBytes: true, checksumSha256: true,
    status: true, publishedAt: true, updatedAt: true,
  },
});

router.get('/current', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [release, maintenance] = await Promise.all([currentRelease(), getMaintenance()]);
    res.json({ success: true, data: { release, maintenance } });
  } catch (error) { next(error); }
});

router.get('/admin', authenticate, authorize('SUPER_ADMIN'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [releases, maintenance] = await Promise.all([
      prisma.appRelease.findMany({ orderBy: [{ createdAt: 'desc' }], take: 50, include: { publishedBy: { select: { fullName: true, email: true } } } }),
      getMaintenance(),
    ]);
    res.json({ success: true, data: { releases, maintenance } });
  } catch (error) { next(error); }
});

router.post('/admin/upload', authenticate, authorize('SUPER_ADMIN'), (req: AuthRequest, res: Response, next: NextFunction) => {
  apkUpload.single('apk')(req, res, (error: unknown) => {
    if (error) {
      const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? 'APK is too large. Maximum size is 100MB.'
        : error instanceof Error ? error.message : 'APK upload failed';
      res.status(400).json({ success: false, message });
      return;
    }
    next();
  });
}, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file?.buffer) throw new AppError('APK file is required', 400);
    const { versionName, versionCode, releaseNotes } = req.body;
    if (!versionName || typeof versionName !== 'string' || versionName.length > 40) throw new AppError('A valid versionName is required', 400);
    const parsedVersionCode = parseVersionCode(versionCode);
    const duplicate = await prisma.appRelease.findFirst({ where: { platform: 'ANDROID', versionCode: parsedVersionCode } });
    if (duplicate) throw new AppError('This Android versionCode already exists', 409);
    const checksumSha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const fileName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const upload = await uploadRawBufferToCloudinary(req.file.buffer, 'app-releases/android', `android-${parsedVersionCode}-${Date.now()}`);
    const release = await prisma.appRelease.create({
      data: {
        platform: 'ANDROID', versionName: versionName.trim(), versionCode: parsedVersionCode,
        releaseNotes: typeof releaseNotes === 'string' ? releaseNotes.trim().slice(0, 2000) || null : null,
        downloadUrl: upload.url, fileName, fileSizeBytes: req.file.buffer.length, checksumSha256,
      },
    });
    res.status(201).json({ success: true, data: release });
  } catch (error) { next(error); }
});

router.post('/admin/:id/publish', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const release = await prisma.appRelease.findUnique({ where: { id: req.params.id } });
    if (!release) throw new AppError('App release not found', 404);
    const published = await prisma.appRelease.update({ where: { id: release.id }, data: { status: 'PUBLISHED', publishedAt: new Date(), publishedById: req.user!.userId } });
    await notificationService.sendBroadcast({
      title: 'New Legacy Homes app update available',
      message: `Version ${published.versionName} is now available. Download the latest Android app from the App Downloads page.`,
      type: 'ESTATE_COMMUNICATION', channels: ['IN_APP', 'EMAIL'], sentBy: req.user!.userId,
      targetGroup: 'active', idempotencyKey: `app-release-published:${published.id}`,
    });
    res.json({ success: true, data: published });
  } catch (error) { next(error); }
});

router.put('/admin/maintenance', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const enabled = Boolean(req.body.enabled);
    const message = typeof req.body.message === 'string' ? req.body.message.trim().slice(0, 500) : '';
    await prisma.$transaction([
      prisma.systemSetting.upsert({ where: { key: 'APP_MAINTENANCE_ENABLED' }, update: { value: String(enabled) }, create: { key: 'APP_MAINTENANCE_ENABLED', value: String(enabled) } }),
      prisma.systemSetting.upsert({ where: { key: 'APP_MAINTENANCE_MESSAGE' }, update: { value: message }, create: { key: 'APP_MAINTENANCE_MESSAGE', value: message } }),
    ]);
    res.json({ success: true, data: await getMaintenance() });
  } catch (error) { next(error); }
});

export default router;
