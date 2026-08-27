const cloudinary = require('../config/cloudinary');

/**
 * Upload image buffer to Cloudinary or fallback to Base64 data URL
 * @param {Buffer} buffer - File buffer
 * @param {string} folder - Folder name in Cloudinary (e.g. 'transitops/vehicles' or 'transitops/drivers')
 * @returns {Promise<string>} Image URL
 */
exports.uploadImage = async (buffer, folder = 'transitops') => {
    return new Promise((resolve, reject) => {
        const isCloudinaryConfigured = !!(
            process.env.CLOUDINARY_URL ||
            (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
        );

        if (isCloudinaryConfigured) {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'image',
                    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                },
                (error, result) => {
                    if (error) {
                        console.error('[CloudinaryService] Upload stream error:', error);
                        // Fallback to base64 on Cloudinary error
                        const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;
                        return resolve(base64Image);
                    }
                    resolve(result.secure_url);
                }
            );
            uploadStream.end(buffer);
        } else {
            console.log('[CloudinaryService] Credentials not set. Using Base64 Data URL storage fallback.');
            const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;
            resolve(base64Image);
        }
    });
};
