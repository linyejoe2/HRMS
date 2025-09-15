import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Grid
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { attendanceAPI } from '../../services/api';
import { AttendanceRecord, UserLevel } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
const AttendanceTab: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Format time for display
  const formatTime = (timeString?: string) => {
    if (!timeString) return '-';
    const date = new Date(timeString);
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  };

  // Format work hours for display
  const formatWorkHours = (hours?: number) => {
    if (!hours) return '-';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  // Get status chip color
  const getStatusColor = (isLate?: boolean, isAbsent?: boolean) => {
    if (isAbsent) return 'error';
    if (isLate) return 'warning';
    return 'success';
  };

  // Get status text
  const getStatusText = (isLate?: boolean, isAbsent?: boolean, clockInTime?: string) => {
    if (isAbsent) return '缺勤';
    if (isLate) return '遲到';
    if (clockInTime) return '正常';
    return '未知';
  };

  // Load attendance records for selected date
  const loadAttendanceRecords = async () => {
    if (!selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      const response = await attendanceAPI.getByDate(selectedDate);
      setAttendanceRecords(response.data.data.records);
    } catch (err: any) {
      setError(err.response?.data?.error || '載入出勤記錄失敗');
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Import attendance data for selected date (admin/hr only)
  const importAttendanceData = async () => {
    if (!selectedDate) return;

    setImporting(true);
    setError(null);

    try {
      const response = await attendanceAPI.importByDate(selectedDate);
      
      if (response.data.imported > 0) {
        // Reload records after import
        await loadAttendanceRecords();
        alert(`成功匯入 ${response.data.imported} 筆出勤記錄`);
      } else {
        alert('未找到該日期的出勤資料檔案');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '匯入出勤資料失敗');
    } finally {
      setImporting(false);
    }
  };

  // Load records when date changes
  useEffect(() => {
    loadAttendanceRecords();
  }, [selectedDate]);

  // Check if user has admin/hr permissions (based on the user level system)
  const isAdminOrHr = user?.role === UserLevel.ADMIN || user?.role === UserLevel.HR; // 0=LAWYER/Admin, 1=CO_LAWYER/HR

  return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          出勤管理
        </Typography>

        {/* Date Selection and Controls */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  label="選擇日期"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadAttendanceRecords}
                    disabled={loading}
                  >
                    重新載入
                  </Button>
                  {isAdminOrHr && (
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={importAttendanceData}
                      disabled={importing}
                    >
                      {importing ? '匯入中...' : '匯入資料'}
                    </Button>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  {selectedDate ? `${selectedDate} 出勤記錄` : '請選擇日期'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && (
          <Box display="flex" justifyContent="center" sx={{ mb: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Attendance Records Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              出勤記錄 ({attendanceRecords.length} 筆)
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>員工編號</TableCell>
                    <TableCell>員工姓名</TableCell>
                    <TableCell>部門名稱</TableCell>
                    <TableCell>出勤日期</TableCell>
                    <TableCell>上班出勤時間</TableCell>
                    <TableCell>上班出勤狀態</TableCell>
                    <TableCell>下班出勤時間</TableCell>
                    <TableCell>下班出勤狀態</TableCell>
                    <TableCell>工作時數</TableCell>
                    <TableCell>出勤狀態</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        <Typography color="text.secondary">
                          {loading ? '載入中...' : '該日期無出勤記錄'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceRecords.map((record) => (
                      <TableRow key={record._id} hover>
                        <TableCell>{record.empID || record.empID2}</TableCell>
                        <TableCell>{record.employeeName || '-'}</TableCell>
                        <TableCell>{record.department || '-'}</TableCell>
                        <TableCell>{formatDate(new Date(record.date))}</TableCell>
                        <TableCell>{formatTime(record.clockInTime)}</TableCell>
                        <TableCell>
                          {record.clockInStatus === 'D000' ? '打卡' : record.clockInStatus || '-'}
                        </TableCell>
                        <TableCell>{formatTime(record.clockOutTime)}</TableCell>
                        <TableCell>
                          {record.clockOutStatus === 'D900' ? '打卡' : record.clockOutStatus || '-'}
                        </TableCell>
                        <TableCell>{formatWorkHours(record.workHours)}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusText(record.isLate, record.isAbsent, record.clockInTime)}
                            color={getStatusColor(record.isLate, record.isAbsent)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
  );
};

export default AttendanceTab;