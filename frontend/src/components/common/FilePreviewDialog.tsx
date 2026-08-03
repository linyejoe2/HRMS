import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Box,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import {
  Description as FileIcon,
  Visibility as PreviewIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import FilePreview from './FilePreview';

interface FilePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  files: string[]; // Array of file paths
  title?: string;
}

const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({
  open,
  onClose,
  files,
  title = '佐證資料',
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const getFileName = (filePath: string): string => {
    return filePath.split('/').pop() || '未知檔案';
  };

  const getFileExtension = (fileName: string): string => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  const getFileType = (fileName: string): string => {
    const ext = getFileExtension(fileName);
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const docTypes = ['doc', 'docx'];
    const pdfTypes = ['pdf'];

    if (imageTypes.includes(ext)) return '圖片';
    if (docTypes.includes(ext)) return 'Word文件';
    if (pdfTypes.includes(ext)) return 'PDF';
    return '檔案';
  };

  const handlePreviewFile = (filePath: string) => {
    setSelectedFile(filePath);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setSelectedFile(null);
  };

  const handleDownloadFile = (filePath: string) => {
    const fullUrl = `/api${filePath}`;
    const fileName = getFileName(filePath);

    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: 300 }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileIcon />
            <Typography variant="h6">{title}</Typography>
            <Chip
              label={`${files.length} 個檔案`}
              size="small"
              color="primary"
              sx={{ ml: 'auto' }}
            />
          </Box>
        </DialogTitle>

        <DialogContent>
          {files.length === 0 ? (
            <Alert severity="info">無佐證資料</Alert>
          ) : (
            <Paper variant="outlined">
              <List>
                {files.map((filePath, index) => {
                  const fileName = getFileName(filePath);
                  const fileType = getFileType(fileName);

                  return (
                    <ListItem
                      key={index}
                      divider={index < files.length - 1}
                      onClick={() => handlePreviewFile(filePath)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <FileIcon sx={{ mr: 2, color: 'text.secondary' }} />
                      <ListItemText
                        primary={fileName}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              類型: {fileType}
                            </Typography>
                          </Box>
                        }
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewFile(filePath);
                          }}
                          color="primary"
                          size="small"
                          title="預覽"
                        >
                          <PreviewIcon />
                        </IconButton>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(filePath);
                          }}
                          color="primary"
                          size="small"
                          title="下載檔案"
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            </Paper>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* File Preview Dialog */}
      <FilePreview
        open={previewOpen}
        onClose={handleClosePreview}
        filePath={selectedFile}
        fileName={selectedFile ? getFileName(selectedFile) : undefined}
      />
    </>
  );
};

export default FilePreviewDialog;
