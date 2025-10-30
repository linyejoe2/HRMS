import React from 'react';
import {
  Box,
  Button,
  Typography,
  Chip
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { validateFiles, SUPPORTED_EXTENSIONS } from '../../utils/fileValidation';

interface FileUploadFieldProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  maxFiles?: number;
}

/**
 * Reusable file upload field component
 * Handles file selection, validation, and display
 */
const FileUploadField: React.FC<FileUploadFieldProps> = ({
  files,
  onFilesChange,
  label = '佐證資料 (選填)',
  helperText = '可上傳多個檔案作為證明',
  disabled = false,
  maxFiles
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      const fileArray = Array.from(selectedFiles);
      const validFiles = validateFiles(fileArray);

      // Check max files limit
      if (maxFiles && files.length + validFiles.length > maxFiles) {
        const allowedCount = maxFiles - files.length;
        onFilesChange([...files, ...validFiles.slice(0, allowedCount)]);
        return;
      }

      onFilesChange([...files, ...validFiles]);
    }
    // Reset input to allow selecting the same file again
    event.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {label}
        {maxFiles && ` (最多 ${maxFiles} 個檔案)`}
      </Typography>

      <Button
        variant="outlined"
        component="label"
        startIcon={<AttachFileIcon />}
        fullWidth
        sx={{ mb: 2 }}
        disabled={disabled || (maxFiles ? files.length >= maxFiles : false)}
      >
        上傳檔案 ({SUPPORTED_EXTENSIONS})
        <input
          type="file"
          hidden
          multiple
          accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
          onChange={handleFileChange}
          disabled={disabled}
        />
      </Button>

      {files.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          {files.map((file, index) => (
            <Chip
              key={`${file.name}-${index}`}
              label={file.name}
              onDelete={disabled ? undefined : () => handleRemoveFile(index)}
              deleteIcon={<DeleteIcon />}
              sx={{ maxWidth: '100%' }}
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" display="block">
        {helperText}
      </Typography>
    </Box>
  );
};

export default FileUploadField;
