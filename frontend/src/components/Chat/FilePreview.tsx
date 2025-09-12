import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  GetApp as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import { Document } from '../../types';
import { documentAPI } from '../../services/api';

interface FilePreviewProps {
  open: boolean;
  onClose: () => void;
  document: Document | null;
}

const FilePreview: React.FC<FilePreviewProps> = ({ open, onClose, document }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (open && document) {
      loadPreview();
    } else {
      setPreviewContent(null);
      setError(null);
      setZoom(100);
    }
  }, [open, document]);

  const loadPreview = async () => {
    if (!document) return;

    setLoading(true);
    setError(null);

    try {
      const response = await documentAPI.downloadDocument(document.document_id);
      const blob = response.data;

      const fileType = getFileType(document.original_name);

      if (fileType === 'image') {
        const imageUrl = URL.createObjectURL(blob);
        setPreviewContent(imageUrl);
      } else if (fileType === 'text') {
        const text = await blob.text();
        setPreviewContent(text);
      } else if (fileType === 'pdf') {
        const pdfUrl = URL.createObjectURL(blob);
        setPreviewContent(pdfUrl);
      } else {
        setError('此檔案類型不支援預覽');
      }
    } catch (err) {
      setError('載入檔案預覽失敗');
      console.error('Error loading preview:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (filename: string): 'image' | 'text' | 'pdf' | 'other' => {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return 'image';
    }

    if (['txt', 'md', 'json', 'xml', 'csv', 'html', 'css', 'js', 'ts', 'jsx', 'tsx'].includes(ext || '')) {
      return 'text';
    }

    if (ext === 'pdf') {
      return 'pdf';
    }

    return 'other';
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      const response = await documentAPI.downloadDocument(document.document_id);
      const blob = response.data;

      const link = window.document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = document.original_name;
      link.click();

      // Clean up the object URL after download
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('下載檔案失敗');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      );
    }

    if (!previewContent || !document) {
      return null;
    }

    const fileType = getFileType(document.original_name);

    switch (fileType) {
      case 'image':
        return (
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <Box>
              <IconButton onClick={() => setZoom(Math.max(25, zoom - 25))}>
                <ZoomOutIcon />
              </IconButton>
              <Typography variant="body2" component="span" sx={{ mx: 1 }}>
                {zoom}%
              </Typography>
              <IconButton onClick={() => setZoom(Math.min(200, zoom + 25))}>
                <ZoomInIcon />
              </IconButton>
            </Box>
            <Paper sx={{ p: 2, overflow: 'auto', height: "100%" }}>
              <img
                src={previewContent}
                alt={document.original_name}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'center top',
                }}
              />
            </Paper>
          </Box>
        );

      case 'text':
        return (
          <Paper sx={{ p: 2, height: "100%", overflow: 'auto' }}>
            <Typography
              variant="body2"
              component="pre"
              sx={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              }}
            >
              {previewContent}
            </Typography>
          </Paper>
        );

      case 'pdf':
        return (
          <Box sx={{ height: "100%" }}>
            <iframe
              src={previewContent}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title={document.original_name}
            />
          </Box>
        );

      default:
        return (
          <Alert severity="info">
            此檔案類型不支援預覽，請下載檔案查看內容。
          </Alert>
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth PaperProps={{
      sx: {
        width: "80vw",
        height: '100vh',
        m: 0,
        maxWidth: "80vw"
      }
    }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div" noWrap>
            {document?.original_name}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ height: "100vh", pb: 0 }}>

        {renderPreview()}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "space-between" }}>
        {document && (
          <Box sx={{ ml: 2 }}>
            <Typography variant="body2" color="text.secondary">
              大小: {formatFileSize(document.file_size)} •
              上傳時間: {new Date(document.created_at).toLocaleString()}
            </Typography>
          </Box>
        )}

        <Box>
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            variant="outlined"
          >
            下載
          </Button>
          <Button onClick={onClose}>
            關閉
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default FilePreview;