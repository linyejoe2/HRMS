import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box
} from '@mui/material';

interface InputDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  title: string;
  message?: string;
  label: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'success';
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  detailsContent?: React.ReactNode;
}

const InputDialog: React.FC<InputDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  label,
  placeholder,
  confirmText = '確認',
  cancelText = '取消',
  confirmColor = 'primary',
  required = true,
  multiline = true,
  rows = 4,
  detailsContent
}) => {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset input when dialog closes
  useEffect(() => {
    if (!open) {
      setInputValue('');
      setLoading(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (required && !inputValue.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onConfirm(inputValue);
      onClose();
    } catch (error) {
      // Error is handled by the parent component
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {message && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {message}
          </Typography>
        )}
        {detailsContent && (
          <Box sx={{ mb: 2 }}>
            {detailsContent}
          </Box>
        )}
        <TextField
          label={label}
          multiline={multiline}
          rows={rows}
          fullWidth
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={loading}
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={confirmColor}
          disabled={loading || (required && !inputValue.trim())}
        >
          {loading ? '處理中...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InputDialog;
