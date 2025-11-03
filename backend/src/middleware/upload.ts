import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// Ensure upload directories exist
const postClockUploadDir = path.join(process.cwd(), config.uploadPath, 'postclock');
const leaveUploadDir = path.join(process.cwd(), config.uploadPath, 'leave');
const businessTripUploadDir = path.join(process.cwd(), config.uploadPath, 'businesstrip');

[postClockUploadDir, leaveUploadDir, businessTripUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper function to sanitize filename and preserve Chinese characters
const sanitizeFilename = (filename: string): string => {
  // Decode the filename properly to handle UTF-8 encoding
  try {
    // If the filename is already garbled, try to decode it
    const decoded = Buffer.from(filename, 'latin1').toString('utf8');
    // Remove or replace invalid filesystem characters but keep Chinese
    return decoded.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  } catch (error) {
    // If decoding fails, fallback to original with replacement
    return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  }
};

// Configure storage for PostClock
const postClockStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, postClockUploadDir);
  },
  filename: (req, file, cb) => {
    // Decode and sanitize the original filename to preserve Chinese characters
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext);
    const sanitizedBasename = sanitizeFilename(basename);

    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${sanitizedBasename}-${uniqueSuffix}${ext}`);
  }
});

// Configure storage for Leave
const leaveStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, leaveUploadDir);
  },
  filename: (req, file, cb) => {
    // Decode and sanitize the original filename to preserve Chinese characters
    const originalName = file.originalname
    // const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext);
    const sanitizedBasename = sanitizeFilename(basename);

    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${sanitizedBasename}-${uniqueSuffix}${ext}`);
  }
});

// Configure storage for BusinessTrip
const businessTripStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, businessTripUploadDir);
  },
  filename: (req, file, cb) => {
    // Decode and sanitize the original filename to preserve Chinese characters
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext);
    const sanitizedBasename = sanitizeFilename(basename);

    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${sanitizedBasename}-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow specific file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支援的檔案格式，只接受 jpg, png, pdf, doc, docx'));
  }
};

// Configure multer instances
export const uploadPostClockFiles = multer({
  storage: postClockStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10 // Maximum 10 files
  }
});

export const uploadLeaveFiles = multer({
  storage: leaveStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10 // Maximum 10 files
  }
});

export const uploadBusinessTripFiles = multer({
  storage: businessTripStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10 // Maximum 10 files
  }
});
