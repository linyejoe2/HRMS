import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon
} from '@mui/icons-material';
import { LeaveRequest } from '../../types';
import { getAllLeaveRequests, approveLeaveRequest, rejectLeaveRequest } from '../../services/api';
import { toast } from 'react-toastify';

const ApproveLeaveTab: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await getAllLeaveRequests('created'); // Only show pending requests by default
      setLeaveRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('無法載入請假申請');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const handleApprove = async (requestId: string) => {
    try {
      await approveLeaveRequest(requestId);
      toast.success('請假申請已核准');
      fetchLeaveRequests();
    } catch (error: any) {
      console.error('Error approving leave request:', error);
      const message = error.response?.data?.message || '核准失敗';
      toast.error(message);
    }
  };

  const handleRejectClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error('請填寫拒絕原因');
      return;
    }

    try {
      await rejectLeaveRequest(selectedRequest._id!, rejectReason);
      toast.success('請假申請已拒絕');
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
      fetchLeaveRequests();
    } catch (error: any) {
      console.error('Error rejecting leave request:', error);
      const message = error.response?.data?.message || '拒絕失敗';
      toast.error(message);
    }
  };

  const handleRejectCancel = () => {
    setRejectDialogOpen(false);
    setSelectedRequest(null);
    setRejectReason('');
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'created':
        return <Chip label="待審核" color="warning" size="small" />;
      case 'approved':
        return <Chip label="已核准" color="success" size="small" />;
      case 'rejected':
        return <Chip label="已拒絕" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          請假審核
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          管理員工請假申請的核准與拒絕
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>員工姓名</TableCell>
                  <TableCell>部門</TableCell>
                  <TableCell>請假類型</TableCell>
                  <TableCell>申請日期</TableCell>
                  <TableCell>請假開始</TableCell>
                  <TableCell>請假結束</TableCell>
                  <TableCell>請假時數</TableCell>
                  <TableCell>原因</TableCell>
                  <TableCell>狀態</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      載入中...
                    </TableCell>
                  </TableRow>
                ) : leaveRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      目前沒有待審核的請假申請
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveRequests.map((request) => (
                    <TableRow key={request._id}>
                      <TableCell>{request.name}</TableCell>
                      <TableCell>{request.department}</TableCell>
                      <TableCell>{request.leaveType}</TableCell>
                      <TableCell>
                        {request.YY}/{request.mm}/{request.DD}
                      </TableCell>
                      <TableCell>
                        {new Date(request.leaveStart).toLocaleString('zh-TW')}
                      </TableCell>
                      <TableCell>
                        {new Date(request.leaveEnd).toLocaleString('zh-TW')}
                      </TableCell>
                      <TableCell>
                        {request.hour}小時{request.minutes}分鐘
                      </TableCell>
                      <TableCell>
                        <Tooltip title={request.reason}>
                          <span>
                            {request.reason.length > 20
                              ? `${request.reason.substring(0, 20)}...`
                              : request.reason}
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {getStatusChip(request.status)}
                      </TableCell>
                      <TableCell>
                        {request.status === 'created' && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="核准">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleApprove(request._id!)}
                              >
                                <ApproveIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="拒絕">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRejectClick(request)}
                              >
                                <RejectIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={handleRejectCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          拒絕請假申請
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                員工: {selectedRequest.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                請假類型: {selectedRequest.leaveType}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                請假時間: {new Date(selectedRequest.leaveStart).toLocaleDateString('zh-TW')}
                至 {new Date(selectedRequest.leaveEnd).toLocaleDateString('zh-TW')}
              </Typography>
            </Box>
          )}
          <TextField
            label="拒絕原因"
            multiline
            rows={4}
            fullWidth
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="請說明拒絕此請假申請的原因..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectCancel}>
            取消
          </Button>
          <Button
            onClick={handleRejectConfirm}
            variant="contained"
            color="error"
            disabled={!rejectReason.trim()}
          >
            確認拒絕
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApproveLeaveTab;