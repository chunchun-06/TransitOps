const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from env variables if available
if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
} else if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

/**
 * Upload image buffer to Cloudinary or fallback to Base64 data URL
 * @param {Buffer} buffer - File buffer
 * @param {string} folder - Folder name in Cloudinary (e.g. 'transitops/vehicles')
 * @returns {Promise<string>} Image URL
 */
exports.uploadImage = async (buffer, folder = 'transitops') => {
    return new Promise((resolve, reject) => {
        const isCloudinaryConfigured = !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);

        if (isCloudinaryConfigured) {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'image',
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        // Fallback to base64 on Cloudinary network error
                        const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;
                        return resolve(base64Image);
                    }
                    resolve(result.secure_url);
                }
            );
            uploadStream.end(buffer);
        } else {
            // Graceful fallback when Cloudinary env vars are missing
            console.log('Cloudinary credentials not set. Using base64 Data URL storage fallback.');
            const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;
            resolve(base64Image);
        }
    });
};
