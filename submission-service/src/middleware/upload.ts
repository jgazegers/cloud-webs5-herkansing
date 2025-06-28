import multer from "multer";
import path from "path";
import fs from "fs";

// Maximum file size (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/submissions';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'submission-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only images
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE // 5MB limit
  },
  fileFilter: fileFilter
});

export { MAX_IMAGE_SIZE };
