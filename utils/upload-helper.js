const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const ensureUploadsDir = () => {
  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Handle local file upload when Cloudinary is unavailable
const handleLocalFileUpload = (file) => {
  const uploadDir = ensureUploadsDir();
  const filename = Date.now() + '-' + file.originalname;
  const filePath = path.join(uploadDir, filename);
  
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, file.buffer, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          url: `/uploads/${filename}`,
          filename
        });
      }
    });
  });
};

module.exports = {
  ensureUploadsDir,
  handleLocalFileUpload
};
