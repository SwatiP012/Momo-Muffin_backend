const multer = require('multer');

let cloudinary, CloudinaryStorage;
try {
  cloudinary = require('cloudinary').v2;
  CloudinaryStorage = require('multer-storage-cloudinary').CloudinaryStorage;

  cloudinary.config({
    cloud_name: "*********",
    api_key: "****************",
    api_secret: "*************************",
  });

  console.log("Cloudinary configured successfully");
} catch (error) {
  console.error("Cloudinary or multer-storage-cloudinary not found. Please install them with 'npm install cloudinary@1.30.0 multer-storage-cloudinary@4.0.0'");
  throw error; // Stop the server if Cloudinary is not available
}

// Always use Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "momo-muffin",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [
      { width: 1000, height: 1000, crop: "limit" },
    ],
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

const uploadWithPath = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

module.exports = { upload: uploadWithPath, cloudinary };
