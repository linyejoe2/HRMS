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
import { UserLevel } from '../../types';
import { employeeAPI, leaveAdjustmentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { formatMinutesToHours, getLeaveColorByHours } from '../../utils/leaveCalculations';
import { LeaveData, fetchUserLeaveData } from '../../services/leaveService';

interface LeaveDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  empID: string;
  employeeName: string;
  leaveData: LeaveData;
  hireDate?: string;
}

const LeaveDetailsDialog: React.FC<LeaveDetailsDialogProps> = ({
  open,
  onClose,
  empID,
  employeeName,
  leaveData: initialLeaveData,
  hireDate
}) => {
  const { user } = useAuth();
  const [leaveData, setLeaveData] = useState<LeaveData>(initialLeaveData);
  const [loading, setLoading] = useState(false);
  const [showAddAdjustment, setShowAddAdjustment] = useState(false);
  const [newAdjustment, setNewAdjustment] = useState({
    minutes: 0,
    reason: ''
  });

  // Check if user can manage adjustments
  const canManageAdjustments = user?.role === UserLevel.HR || user?.role === UserLevel.ADMIN;

  // Update local state when prop changes
  useEffect(() => {
    setLeaveData(initialLeaveData);
  }, [initialLeaveData]);

  function generateCreatedByName(createdBy: string) {
    const [name, setName] = useState<string>("");

    useEffect(() => {
      employeeAPI.getNameById(createdBy).then(setName);
    }, [createdBy]);

    return name || "Loading...";
  }

  const refreshLeaveData = async (hireDate?: string) => {
    if (!hireDate) {
      toast.error('缺少入職日期');
      return;
    }

    setLoading(true);
    try {
      const userData = await fetchUserLeaveData(empID, hireDate);
      // Get the specific leave type data
      const typeKey = leaveData.type === '事假' ? 'personalLeave'
        : leaveData.type === '普通傷病假' ? 'sickLeave'
          : 'specialLeave';
      setLeaveData(userData[typeKey]);
    } catch (error) {
      console.error('Error refreshing leave data:', error);
      toast.error('刷新假別資料失敗');
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
      await refreshLeaveData(hireDate);
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
      await refreshLeaveData(hireDate);
    } catch (error: any) {
      toast.error(error.response?.data?.error || '刪除調整失敗');
    }
  };

  // Use data from leaveData state (already calculated in the service)
  const totalUsedHours = leaveData.usedHours;
  const totalHours = leaveData.totalHours;
  const remainingHours = leaveData.remainingHours;
  const leaves = leaveData.leaves;
  const adjustments = leaveData.adjustments;

  // Calculate total adjustment hours for display
  const totalAdjustmentHours = adjustments.reduce((total, adj) => {
    return total + (adj.minutes / 60);
  }, 0);

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
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
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
                      <TableCell colSpan={3} align="left">
                        <strong>小計:</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{Math.round(totalUsedHours)} 小時</strong>
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
                調整記錄
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
                <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
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

            <TableContainer sx={{ mb: 3 }} component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>調整時間</TableCell>
                    <TableCell>調整時數</TableCell>
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
                        <TableCell>
                          <Chip
                            label={`${adj.minutes > 0 ? '+' : ''}${formatMinutesToHours(adj.minutes)} 小時`}
                            color={adj.minutes > 0 ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{adj.reason}</TableCell>
                        <TableCell>{generateCreatedByName(adj.createdBy)}</TableCell>
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
                      <TableCell >
                        <strong>小計:</strong>
                      </TableCell>
                      <TableCell >
                        <strong>{Math.round(totalAdjustmentHours)} 小時</strong>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary */}
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              統計摘要
            </Typography>
            <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">總額度:</Typography>
                <Typography variant="body2">
                  {Math.round(totalHours)} 小時
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">已使用:</Typography>
                <Typography variant="body2">
                  {Math.round(totalUsedHours)} 小時
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">手動調整:</Typography>
                <Typography variant="body2">
                  {Math.round(totalAdjustmentHours)} 小時
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body1" fontWeight="bold">
                  剩餘:
                </Typography>
                <Typography variant="body1" fontWeight="bold" color={remainingHours < 0 ? 'error.main' : 'primary.main'}>
                  {Math.round(remainingHours)} 小時
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
