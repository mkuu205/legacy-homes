import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { logger } from './logger';

// Validate configuration at boot — fail fast & loud rather than silently
const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
const REQUIRED_ENV = {
  CLOUDINARY_CLOUD_NAME: cloudName,
  CLOUDINARY_API_KEY: apiKey,
  CLOUDINARY_API_SECRET: apiSecret,
} as const;
const MISSING_ENV = (Object.keys(REQUIRED_ENV) as Array<keyof typeof REQUIRED_ENV>)
  .filter((key) => !REQUIRED_ENV[key]);

if (MISSING_ENV.length) {
  logger.error(`[CLOUDINARY] Missing required env vars: ${MISSING_ENV.join(', ')} — uploads will fail.`);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
}

/**
 * Upload from memory buffer (preferred — does NOT require a writable disk on the host).
 * This is what fixes the production 500 on Railway: previously we relied on multer
 * writing to /tmp/uploads/ then handing a file *path* to Cloudinary, which broke when
 * the directory was missing or read-only inside the container.
 */
export const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder: string,
  transform?: Record<string, unknown>,
): Promise<CloudinaryUploadResult> => {
  if (MISSING_ENV.length) {
    const error = new Error(`Cloudinary not configured: missing ${MISSING_ENV.join(', ')}`);
    (error as any).statusCode = 503; // Service Unavailable
    return Promise.reject(error);
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `legacy-homes/${folder}`,
        resource_type: 'image',
        overwrite: true,
        invalidate: true,
        transformation: transform ? [transform] : undefined,
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          logger.error('[CLOUDINARY] upload_stream failed', { error, folder });
          return reject(error || new Error('Cloudinary returned no result'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
        });
      },
    );
    stream.end(buffer);
  });
};

/** Legacy path-based upload, kept for any callers that still pass a file path. */
export const uploadToCloudinary = async (filePath: string, folder = 'legacy-homes'): Promise<string> => {
  if (MISSING_ENV.length) {
    throw new Error(`Cloudinary not configured: missing ${MISSING_ENV.join(', ')}`);
  }
  const transform =
    folder === 'profile-pictures'
      ? { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' }
      : undefined;
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `legacy-homes/${folder}`,
    resource_type: 'auto',
    transformation: transform ? [transform] : undefined,
  });
  return result.secure_url;
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (error) {
    logger.error('[CLOUDINARY] delete failed (non-fatal)', { error, publicId });
  }
};

/** Best-effort extraction of the Cloudinary public_id from a stored secure_url. */
export const publicIdFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    // .../upload/v1234567/<public_id>.<ext>  OR .../upload/<transform>/v.../<public_id>.<ext>
    const parts = u.pathname.split('/').filter(Boolean);
    const uploadIdx = parts.findIndex((p) => p === 'upload');
    if (uploadIdx === -1) return null;
    const tail = parts.slice(uploadIdx + 1).filter((p) => !/^v\d+$/.test(p));
    const last = tail.pop();
    if (!last) return null;
    const withoutExt = last.replace(/\.[a-z0-9]+$/i, '');
    return [...tail, withoutExt].join('/');
  } catch {
    return null;
  }
};

/** Authenticated ping for the health monitor. */
export const cloudinaryHealthCheck = async (): Promise<boolean> => {
  if (MISSING_ENV.length) return false;
  try {
    const r = (await cloudinary.api.ping()) as { status?: string };
    return r?.status === 'ok';
  } catch (e) {
    logger.warn('[CLOUDINARY] ping failed', { e });
    return false;
  }
};
