"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudinary = exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const logger_1 = require("./logger");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const uploadToCloudinary = async (filePath, folder = 'legacy-homes') => {
    try {
        const options = {
            folder: `legacy-homes/${folder}`,
            resource_type: 'auto',
        };
        if (folder === 'profile-pictures') {
            options.transformation = {
                width: 400,
                height: 400,
                crop: 'fill',
                gravity: 'face',
                quality: 'auto',
                fetch_format: 'auto',
            };
        }
        const result = await cloudinary_1.v2.uploader.upload(filePath, options);
        logger_1.logger.info(`File uploaded to Cloudinary: ${result.secure_url}`);
        return result.secure_url;
    }
    catch (error) {
        logger_1.logger.error('Cloudinary upload failed:', error);
        throw new Error('File upload failed');
    }
};
exports.uploadToCloudinary = uploadToCloudinary;
const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary_1.v2.uploader.destroy(publicId);
    }
    catch (error) {
        logger_1.logger.error('Cloudinary delete failed:', error);
    }
};
exports.deleteFromCloudinary = deleteFromCloudinary;
//# sourceMappingURL=cloudinary.js.map