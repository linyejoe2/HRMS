import React, { useState, useEffect } from 'react';
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
  IconButton,
  TextField,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { LeaveRequest, LeaveAdjustment, UserLevel } from '../../types';
import { queryLeaveRequests, leaveAdjustmentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { formatMinutesToHours, getLeaveColorByHours, RemainingLeaveData } from '../../utils/leaveCalculations';

interface LeaveDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  empID: string;
  employeeName: string;
  leaveData: RemainingLeaveData;
}

const LeaveDetailsDialog: React.FC<LeaveDetailsDialogProps> = ({
  open,
  onClose,
  empID,
  employeeName,
  leaveData
}) => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [adjustments, setAdjustments] = useState<LeaveAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddAdjustment, setShowAddAdjustment] = useState(false);
  const [newAdjustment, setNewAdjustment] = useState({
    minutes: 0,
    reason: ''
  });

  // Check if user can manage adjustments
  const canManageAdjustments = user?.role === UserLevel.HR || user?.role === UserLevel.ADMIN;

  // Fetch leave requests and adjustments
  useEffect(() => {
    if (open && empID) {
      fetchLeaveData();
    }
  }, [open, empID, leaveData.type]);

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      // Fetch leave requests
      const leaveResponse = await queryLeaveRequests({
        timeStart: oneYearAgo.toISOString(),
        timeEnd: now.toISOString(),
        leaveType: leaveData.type,
        status: 'approved'
      });

      // Filter by employee
      const employeeLeaves = leaveResponse.data.data.filter((l: LeaveRequest) => l.empID === empID);
      setLeaves(employeeLeaves);

      // Fetch adjustments
      const adjustmentResponse = await leaveAdjustmentAPI.getByEmployee(empID, leaveData.type);
      setAdjustments(adjustmentResponse.data.data);
    } catch (error) {
      console.error('Error fetching leave data:', error);
      toast.error('載入假別資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdjustment = async () => {
    if (!newAdjustment.reason.trim()) {
      toast.error('請輸入調整原因');
      return;
    }

    if (newAdjustment.minutes === 0) {
      toast.error('請輸入調整時數');
      return;
    }

    try {
      await leaveAdjustmentAPI.create({
        empID,
        leaveType: leaveData.type,
        minutes: newAdjustment.minutes,
        reason: newAdjustment.reason
      });

      toast.success('假別調整已新增');
      setShowAddAdjustment(false);
      setNewAdjustment({ minutes: 0, reason: '' });
      fetchLeaveData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '新增調整失敗');
    }
  };

  const handleDeleteAdjustment = async (id: string) => {
    if (!window.confirm('確定要刪除此調整記錄嗎？')) {
      return;
    }

    try {
      await leaveAdjustmentAPI.delete(id);
      toast.success('調整記錄已刪除');
      fetchLeaveData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '刪除調整失敗');
    }
  };

  // Calculate totals
  const totalUsedMinutes = leaves.reduce((total, leave) => {
    const hours = parseInt(leave.hour) || 0;
    const minutes = parseInt(leave.minutes) || 0;
    return total + (hours * 60) + minutes;
  }, 0);

  const totalAdjustmentMinutes = adjustments.reduce((total, adj) => total + adj.minutes, 0);

  // Calculate total entitled leave
  const getTotalEntitledMinutes = () => {
    switch (leaveData.type) {
      case '事假':
        return 14 * 8 * 60; // 14 days
      case '普通傷病假':
        return 30 * 8 * 60; // 30 days
      case '特別休假':
        // This would need the hire date calculation
        // For now, return 0 or calculate based on hireDate
        return 0;
      default:
        return 0;
    }
  };

  const totalEntitledMinutes = getTotalEntitledMinutes();
  const remainingMinutes = totalEntitledMinutes - totalUsedMinutes - totalAdjustmentMinutes;
  const remainingHours = formatMinutesToHours(remainingMinutes);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {employeeName} - {leaveData.type}
          </Typography>
          <Box>
            <Chip
              label={`剩餘: ${remainingHours} 小時`}
              color={getLeaveColorByHours(remainingHours)}
              sx={{ fontWeight: 'bold', mr: 1 }}
            />
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Leave Requests Table */}
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
              請假記錄
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>日期</TableCell>
                    <TableCell>開始時間</TableCell>
                    <TableCell>結束時間</TableCell>
                    <TableCell align="right">時數</TableCell>
                    <TableCell>原因</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaves.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">
                          無請假記錄
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaves.map((leave) => (
                      <TableRow key={leave._id}>
                        <TableCell>
                          {new Date(leave.leaveStart).toLocaleDateString('zh-TW')}
                        </TableCell>
                        <TableCell>
                          {new Date(leave.leaveStart).toLocaleTimeString('zh-TW', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          {new Date(leave.leaveEnd).toLocaleTimeString('zh-TW', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell align="right">
                          {leave.hour}:{leave.minutes.padStart(2, '0')}
                        </TableCell>
                        <TableCell>{leave.reason}</TableCell>
                      </TableRow>
                    ))
                  )}
                  {leaves.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <strong>小計:</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{formatMinutesToHours(totalUsedMinutes)} 小時</strong>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Adjustments Table */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                手動調整記錄
              </Typography>
              {canManageAdjustments && !showAddAdjustment && (
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setShowAddAdjustment(true)}
                  variant="outlined"
                >
                  新增調整
                </Button>
              )}
            </Box>

            {showAddAdjustment && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  新增假別調整
                </Typography>
                <Box display="flex" gap={2} alignItems="flex-start">
                  <TextField
                    label="調整時數"
                    type="number"
                    size="small"
                    value={newAdjustment.minutes / 60}
                    onChange={(e) =>
                      setNewAdjustment({
                        ...newAdjustment,
                        minutes: parseFloat(e.target.value) * 60
                      })
                    }
                    helperText="正數=扣除假別，負數=增加假別"
                    sx={{ width: 150 }}
                  />
                  <TextField
                    label="調整原因"
                    size="small"
                    fullWidth
                    value={newAdjustment.reason}
                    onChange={(e) =>
                      setNewAdjustment({ ...newAdjustment, reason: e.target.value })
                    }
                  />
                  <Button variant="contained" onClick={handleAddAdjustment}>
                    儲存
                  </Button>
                  <Button onClick={() => setShowAddAdjustment(false)}>取消</Button>
                </Box>
              </Paper>
            )}

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>調整時間</TableCell>
                    <TableCell align="right">調整時數</TableCell>
                    <TableCell>原因</TableCell>
                    <TableCell>調整者</TableCell>
                    {canManageAdjustments && <TableCell align="center">操作</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adjustments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManageAdjustments ? 5 : 4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          無調整記錄
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    adjustments.map((adj) => (
                      <TableRow key={adj._id}>
                        <TableCell>
                          {new Date(adj.createdAt || '').toLocaleString('zh-TW')}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${adj.minutes > 0 ? '+' : ''}${formatMinutesToHours(adj.minutes)} 小時`}
                            color={adj.minutes > 0 ? 'error' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{adj.reason}</TableCell>
                        <TableCell>{adj.createdBy}</TableCell>
                        {canManageAdjustments && (
                          <TableCell align="center">
                            <Tooltip title="刪除">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteAdjustment(adj._id!)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                  {adjustments.length > 0 && (
                    <TableRow>
                      <TableCell align="right">
                        <strong>小計:</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{formatMinutesToHours(totalAdjustmentMinutes)} 小時</strong>
                      </TableCell>
                      <TableCell colSpan={canManageAdjustments ? 3 : 2} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary */}
            <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                統計摘要
              </Typography>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">總額度:</Typography>
                <Typography variant="body2">
                  {formatMinutesToHours(totalEntitledMinutes)} 小時
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">已使用:</Typography>
                <Typography variant="body2">
                  {formatMinutesToHours(totalUsedMinutes)} 小時
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">手動調整:</Typography>
                <Typography variant="body2">
                  {formatMinutesToHours(totalAdjustmentMinutes)} 小時
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body1" fontWeight="bold">
                  剩餘:
                </Typography>
                <Typography variant="body1" fontWeight="bold" color={remainingMinutes < 0 ? 'error.main' : 'primary.main'}>
                  {remainingHours} 小時
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>關閉</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeaveDetailsDialog;
