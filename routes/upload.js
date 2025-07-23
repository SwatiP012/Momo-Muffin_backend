const express = require('express');
const router = express.Router();
const { upload } = require('../helpers/cloudinary');

// Upload single image
router.post('/', upload('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // If using Cloudinary, the file will have a secure_url
        const imageUrl = req.file.secure_url || req.file.path;

        res.json({
            success: true,
            url: imageUrl
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading file'
        });
    }
});

module.exports = router; 