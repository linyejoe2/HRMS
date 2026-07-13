import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { leaveBenefitSections } from '@/services/leaveService';

interface OtherLeaveBenefitsDialogProps {
  open: boolean;
  onClose: () => void;
}

const OtherLeaveBenefitsDialog: React.FC<OtherLeaveBenefitsDialogProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        請假權益說明
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {leaveBenefitSections.map((section, index) => (
            <Box key={section.title}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {section.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                {section.content}
              </Typography>
              {index < leaveBenefitSections.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          關閉
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OtherLeaveBenefitsDialog;
