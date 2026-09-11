import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography } from '@mui/material';
import { Check as CheckIcon, Close as CloseIcon, HourglassEmpty as PendingIcon } from '@mui/icons-material';

export type ApprovalStageState = 'approved' | 'rejected' | 'pending';

export interface ApprovalStage {
  label: string;
  state: ApprovalStageState;
}

interface ApprovalTimelineModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  stages: ApprovalStage[];
}

const STATE_COLOR: Record<ApprovalStageState, string> = {
  approved: '#2e7d32',
  rejected: '#d32f2f',
  pending: '#9e9e9e'
};

const StageNode: React.FC<{ stage: ApprovalStage }> = ({ stage }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, minWidth: 88 }}>
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor: STATE_COLOR[stage.state],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        flexShrink: 0
      }}
    >
      {stage.state === 'approved' && <CheckIcon fontSize="small" />}
      {stage.state === 'rejected' && <CloseIcon fontSize="small" />}
      {stage.state === 'pending' && <PendingIcon fontSize="small" />}
    </Box>
    <Typography variant="body2" align="center" sx={{ mt: 1, fontWeight: 500, px: 0.5 }}>
      {stage.label}
    </Typography>
  </Box>
);

// Generic horizontal approval-progress timeline: node -- line -- node -- line -- node...
// Reusable across any workflow that has a sequence of approve/reject/pending stages
// (leave's substitute/manager review, business-trip/post-clock/official-business manager
// review, etc.) — the caller only needs to supply the ordered `stages` array.
const ApprovalTimelineModal: React.FC<ApprovalTimelineModalProps> = ({ open, onClose, title = '審核進度', stages }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', py: 3, px: 1 }}>
          {stages.map((stage, index) => (
            <React.Fragment key={index}>
              <StageNode stage={stage} />
              {index < stages.length - 1 && (
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 24,
                    height: 4,
                    mt: '14px',
                    backgroundColor: stage.state === 'approved' ? STATE_COLOR.approved : STATE_COLOR.pending
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>關閉</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApprovalTimelineModal;
