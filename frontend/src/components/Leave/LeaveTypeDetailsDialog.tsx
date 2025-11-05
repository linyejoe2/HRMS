import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip
} from '@mui/material';
import { LeaveRequest } from '../../types';

interface LeaveTypeDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  leaveType: string;
  leaves: LeaveRequest[];
}

const LeaveTypeDetailsDialog: React.FC<LeaveTypeDetailsDialogProps> = ({
  open,
  onClose,
  leaveType,
  leaves
}) => {
  // Calculate total used time
  const totalUsedMinutes = leaves.reduce((total, leave) => {
    const hours = parseInt(leave.hour) || 0;
    const minutes = parseInt(leave.minutes) || 0;
    return total + (hours * 60) + minutes;
  }, 0);

  const totalHours = Math.floor(totalUsedMinutes / 60);
  const totalMinutes = totalUsedMinutes % 60;
  const totalDays = (totalUsedMinutes / (8 * 60)).toFixed(2);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {leaveType} - 已核准請假紀錄
          </Typography>
          <Chip
            label={`共 ${leaves.length} 筆`}
            color="primary"
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Summary Section */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            統計摘要 (過去一年)
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Typography variant="body2">
              總時數：<strong>{totalHours} 小時 {totalMinutes} 分鐘</strong>
            </Typography>
            <Typography variant="body2">
              總天數：<strong>{totalDays} 天</strong>
            </Typography>
          </Box>
        </Box>

        {/* Leave Records Table */}
        {leaves.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              過去一年無已核准的 {leaveType} 紀錄
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>編號</strong></TableCell>
                  <TableCell><strong>申請日期</strong></TableCell>
                  <TableCell><strong>請假開始</strong></TableCell>
                  <TableCell><strong>請假結束</strong></TableCell>
                  <TableCell><strong>時數</strong></TableCell>
                  <TableCell><strong>理由</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaves.map((leave) => (
                  <TableRow key={leave._id} hover>
                    <TableCell>#{leave.sequenceNumber}</TableCell>
                    <TableCell>{`${leave.YYYY}/${leave.mm}/${leave.DD}`}</TableCell>
                    <TableCell>
                      {new Date(leave.leaveStart).toLocaleString('zh-TW', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      {new Date(leave.leaveEnd).toLocaleString('zh-TW', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      {leave.hour}h {leave.minutes}m
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {leave.reason}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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

export default LeaveTypeDetailsDialog;
