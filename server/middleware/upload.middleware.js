const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the uploads directory exists securely to prevent startup crashes
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage destination and filename logic
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Prepend timestamp to original filename to avoid collisions
    const secureFilename = Date.now() + '-' + file.originalname;
    cb(null, secureFilename);
  }
});

// Configure file filter to reject non-image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files are allowed!'), false);
  }
};

// Initialize multer with storage and filter configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Optional safety limit: 5MB max
  }
});

module.exports = upload;
