import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';

interface FilePreviewProps {
  open: boolean;
  onClose: () => void;
  filePath: string | null;
  fileName?: string;
}

const API_BASE_URL = "/api";

const FilePreview: React.FC<FilePreviewProps> = ({
  open,
  onClose,
  filePath,
  fileName,
}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const getFileExtension = (path: string): string => {
    const parts = path.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  const getDisplayName = (): string => {
    if (fileName) return fileName;
    if (filePath) return filePath.split('/').pop() || '檔案預覽';
    return '檔案預覽';
  };

  const handleDownload = () => {
    if (!filePath) return;
    const fullUrl = `${API_BASE_URL}${filePath}`;
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = getDisplayName();
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenNewTab = () => {
    if (!filePath) return;
    const fullUrl = `${API_BASE_URL}${filePath}`;
    window.open(fullUrl, '_blank');
  };

  const renderPreview = () => {
    if (!filePath) {
      return (
        <Alert severity="warning">
          無法載入檔案預覽
        </Alert>
      );
    }

    const fullUrl = `${API_BASE_URL}${filePath}`;
    const extension = getFileExtension(filePath);
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const pdfTypes = ['pdf'];

    if (imageTypes.includes(extension)) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
            position: 'relative',
          }}
        >
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <CircularProgress />
            </Box>
          )}
          <img
            src={fullUrl}
            alt={getDisplayName()}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              display: loading ? 'none' : 'block',
              objectFit: 'contain',
            }}
          />
          {error && (
            <Alert severity="error">
              無法載入圖片
            </Alert>
          )}
        </Box>
      );
    }

    if (pdfTypes.includes(extension)) {
      return (
        <Box
          sx={{
            width: '100%',
            height: '70vh',
            position: 'relative',
          }}
        >
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <CircularProgress />
            </Box>
          )}
          <iframe
            src={fullUrl}
            title={getDisplayName()}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: loading ? 'none' : 'block',
            }}
          />
          {error && (
            <Alert severity="error">
              無法載入 PDF。<Button onClick={handleOpenNewTab}>在新分頁開啟</Button>
            </Alert>
          )}
        </Box>
      );
    }

    // For other file types (doc, docx, etc.)
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
          gap: 2,
        }}
      >
        <Alert severity="info" sx={{ mb: 2 }}>
          此檔案類型無法在瀏覽器中預覽
        </Alert>
        <Typography variant="body1" color="text.secondary">
          檔案名稱: {getDisplayName()}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            下載檔案
          </Button>
          <Button
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            onClick={handleOpenNewTab}
          >
            在新分頁開啟
          </Button>
        </Box>
      </Box>
    );
  };

  // Reset loading state when file changes
  React.useEffect(() => {
    setLoading(true);
    setError(false);
  }, [filePath]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div" noWrap sx={{ maxWidth: '70%' }}>
            {getDisplayName()}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={handleDownload}
              size="small"
              title="下載"
              disabled={!filePath}
            >
              <DownloadIcon />
            </IconButton>
            <IconButton
              onClick={handleOpenNewTab}
              size="small"
              title="在新分頁開啟"
              disabled={!filePath}
            >
              <OpenInNewIcon />
            </IconButton>
            <IconButton
              onClick={onClose}
              size="small"
              title="關閉"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {renderPreview()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>關閉</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilePreview;
