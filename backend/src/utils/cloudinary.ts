import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (
  filePath: string,
  folder: string = 'legacy-homes'
): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `legacy-homes/${folder}`,
      resource_type: 'auto',
      transformation: folder === 'profile-pictures' ? [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ] : undefined,
    });
    logger.info(`File uploaded to Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    logger.error('Cloudinary upload failed:', error);
    throw new Error('File upload failed');
  }
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.error('Cloudinary delete failed:', error);
  }
};
