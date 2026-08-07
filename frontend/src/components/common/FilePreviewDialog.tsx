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
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import FilePreview from './FilePreview';
import FileUploadField from './FileUploadField';

interface FilePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  files: string[];
  title?: string;
  canManage?: boolean;
  onUpload?: (files: File[]) => Promise<void>;
  onDelete?: (filePath: string) => Promise<void>;
  uploadLabel?: string;
}

const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({
  open,
  onClose,
  files,
  title = '佐證資料',
  canManage = false,
  onUpload,
  onDelete,
  uploadLabel = '上傳檔案',
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const getFileName = (filePath: string): string => filePath.split('/').pop() || '未知檔案';

  const getFileExtension = (fileName: string): string => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  const getFileType = (fileName: string): string => {
    const ext = getFileExtension(fileName);
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return '圖片';
    if (['doc', 'docx'].includes(ext)) return 'Word文件';
    if (ext === 'pdf') return 'PDF';
    return '檔案';
  };

  const handlePreviewFile = (filePath: string) => {
    setSelectedFile(filePath);
    setPreviewOpen(true);
  };

  const handleDownloadFile = (filePath: string) => {
    const link = document.createElement('a');
    link.href = `/api${filePath}`;
    link.download = getFileName(filePath);
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!onUpload || pendingFiles.length === 0) return;
    setSubmitting(true);
    try {
      await onUpload(pendingFiles);
      setPendingFiles([]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (filePath: string) => {
    if (!onDelete || !window.confirm(`確定要刪除「${getFileName(filePath)}」嗎？`)) return;
    setSubmitting(true);
    try {
      await onDelete(filePath);
    } finally {
      setSubmitting(false);
    }
  };

  const remainingFiles = Math.max(0, 10 - files.length);

  return (
    <>
      <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth PaperProps={{ sx: { minHeight: 300 } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileIcon />
            <Typography variant="h6">{title}</Typography>
            <Chip label={`${files.length} 個檔案`} size="small" color="primary" sx={{ ml: 'auto' }} />
          </Box>
        </DialogTitle>

        <DialogContent>
          {canManage && onUpload && (
            <Box sx={{ mb: 2 }}>
              <FileUploadField
                files={pendingFiles}
                onFilesChange={setPendingFiles}
                label={uploadLabel}
                helperText={remainingFiles > 0 ? `尚可上傳 ${remainingFiles} 個檔案` : '已達 10 個附件上限'}
                disabled={submitting || remainingFiles === 0}
                maxFiles={remainingFiles}
              />
              {pendingFiles.length > 0 && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleUpload} disabled={submitting} sx={{ mt: 1 }}>
                  新增附件
                </Button>
              )}
            </Box>
          )}

          {files.length === 0 ? (
            <Alert severity="info">無{title}</Alert>
          ) : (
            <Paper variant="outlined">
              <List>
                {files.map((filePath, index) => {
                  const fileName = getFileName(filePath);
                  return (
                    <ListItem
                      key={filePath}
                      divider={index < files.length - 1}
                      onClick={() => handlePreviewFile(filePath)}
                      sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                    >
                      <FileIcon sx={{ mr: 2, color: 'text.secondary' }} />
                      <ListItemText primary={fileName} secondary={<Typography variant="caption">類型: {getFileType(fileName)}</Typography>} />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton onClick={(event) => { event.stopPropagation(); handlePreviewFile(filePath); }} color="primary" size="small" title="預覽">
                          <PreviewIcon />
                        </IconButton>
                        <IconButton onClick={(event) => { event.stopPropagation(); handleDownloadFile(filePath); }} color="primary" size="small" title="下載檔案">
                          <DownloadIcon />
                        </IconButton>
                        {canManage && onDelete && (
                          <IconButton onClick={(event) => { event.stopPropagation(); handleDelete(filePath); }} color="error" size="small" title="刪除檔案" disabled={submitting}>
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            </Paper>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>關閉</Button>
        </DialogActions>
      </Dialog>

      <FilePreview
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setSelectedFile(null); }}
        filePath={selectedFile}
        fileName={selectedFile ? getFileName(selectedFile) : undefined}
      />
    </>
  );
};

export default FilePreviewDialog;
