import { toast } from 'react-toastify';

/**
 * Supported file types for document upload
 */
export const SUPPORTED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] as const;

/**
 * File extensions for display
 */
export const SUPPORTED_EXTENSIONS = 'jpg, jpeg, png, pdf, doc, docx';

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validates a single file
 * @param file - File to validate
 * @returns true if valid, false otherwise
 */
export const validateFile = (file: File): boolean => {
  // Check file type
  if (!SUPPORTED_FILE_TYPES.includes(file.type as any)) {
    toast.error(`檔案 ${file.name} 格式不支援，只接受 ${SUPPORTED_EXTENSIONS}`);
    return false;
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    toast.error(`檔案 ${file.name} 超過大小限制 (最大 10MB)`);
    return false;
  }

  return true;
};

/**
 * Validates multiple files
 * @param files - Array of files to validate
 * @returns Array of valid files
 */
export const validateFiles = (files: File[]): File[] => {
  return files.filter(validateFile);
};

/**
 * Formats file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Gets file extension from filename
 * @param filename - Name of the file
 * @returns File extension (e.g., "pdf")
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};
