import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Divider,
  Stack
} from '@mui/material';
import { leaveAPI } from '../../services/api';
import { LeaveRequest } from '../../types';
import { toast } from 'react-toastify';

interface LeaveDetailsModalProps {
  open: boolean;
  onClose: () => void;
  leaveSequenceNumbers: number[];
  attendanceDate: string;
}

const LeaveDetailsModal: React.FC<LeaveDetailsModalProps> = ({
  open,
  onClose,
  leaveSequenceNumbers,
  attendanceDate
}) => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && leaveSequenceNumbers.length > 0) {
      loadLeaveDetails();
    }
  }, [open, leaveSequenceNumbers]);

  const loadLeaveDetails = async () => {
    setLoading(true);
    try {
      // Fetch all leave details
      const leavePromises = leaveSequenceNumbers.map(seqNum =>
        leaveAPI.getBySequenceNumber(seqNum)
      );
      const responses = await Promise.all(leavePromises);
      const leaveData = responses
        .filter(res => !res.data.error)
        .map(res => res.data.data);
      setLeaves(leaveData);
    } catch (error: any) {
      toast.error('載入請假資訊失敗');
      console.error('Failed to load leave details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'cancel':
        return 'default';
      default:
        return 'warning';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return '已核准';
      case 'rejected':
        return '已拒絕';
      case 'cancel':
        return '已取消';
      case 'created':
        return '待審核';
      default:
        return status;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        請假詳細資訊
        <Typography variant="body2" color="text.secondary">
          出勤日期: {attendanceDate}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : leaves.length === 0 ? (
          <Typography color="text.secondary" align="center">
            無請假資訊
          </Typography>
        ) : (
          <Stack spacing={2}>
            {leaves.map((leave, index) => (
              <Box
                key={leave.sequenceNumber || index}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.default'
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" component="div">
                    請假單 #{leave.sequenceNumber}
                  </Typography>
                  <Chip
                    label={getStatusText(leave.status)}
                    color={getStatusColor(leave.status)}
                    size="small"
                  />
                </Box>

                <Divider sx={{ my: 1 }} />

                <Stack spacing={1}>
                  <Box display="flex" gap={1}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                      員工:
                    </Typography>
                    <Typography variant="body2">
                      {leave.name} ({leave.empID})
                    </Typography>
                  </Box>

                  <Box display="flex" gap={1}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                      部門:
                    </Typography>
                    <Typography variant="body2">
                      {leave.department}
                    </Typography>
                  </Box>

                  <Box display="flex" gap={1}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                      請假類別:
                    </Typography>
                    <Typography variant="body2">
                      {leave.leaveType}
                    </Typography>
                  </Box>

                  <Box display="flex" gap={1}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                      請假期間:
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(leave.leaveStart)} ~ {formatDate(leave.leaveEnd)}
                    </Typography>
                  </Box>

                  <Box display="flex" gap={1}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                      請假時數:
                    </Typography>
                    <Typography variant="body2">
                      {leave.hour}小時 {leave.minutes}分鐘
                    </Typography>
                  </Box>

                  <Box display="flex" gap={1}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                      請假事由:
                    </Typography>
                    <Typography variant="body2">
                      {leave.reason}
                    </Typography>
                  </Box>

                  {leave.approvedBy && (
                    <Box display="flex" gap={1}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                        審核人:
                      </Typography>
                      <Typography variant="body2">
                        {leave.approvedBy}
                      </Typography>
                    </Box>
                  )}

                  {leave.rejectionReason && (
                    <Box display="flex" gap={1}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                        拒絕原因:
                      </Typography>
                      <Typography variant="body2" color="error">
                        {leave.rejectionReason}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          關閉
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeaveDetailsModal;
