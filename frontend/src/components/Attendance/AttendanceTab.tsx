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
  CircularProgress,
  Chip,
  Grid
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { attendanceAPI } from '../../services/api';
import { AttendanceRecord, UserLevel } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
const AttendanceTab: React.FC = () => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 7 days ago
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]); // today
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
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

  // Load attendance records for selected date range
  const loadAttendanceRecords = async () => {
    if (!startDate || !endDate) return;

    if (startDate > endDate) {
      toast.error('開始日期不能晚於結束日期');
      return;
    }

    setLoading(true);

    try {
      const response = await attendanceAPI.getByDateRange(startDate, endDate);
      setAttendanceRecords(response.data.data.records);
      if (response.data.data.records.length === 0) {
        toast.info('該日期範圍無出勤記錄');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || '載入出勤記錄失敗');
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const manualupdateAttendanceData = async () => {
    setImporting(true);

    try {
      const res = await attendanceAPI.scanNow()

      if (!res.data.success) {
        toast.error('無法更新資料');
        console.log("error:")
        console.log(JSON.stringify(res.data))
        return;
      }

      const { processed, imported } = res.data.data;
      if (imported > 0) {
        toast.success(`成功更新，掃描 ${processed} 個檔案，更新 ${imported} 筆資料。`);
        // Reload records after successful update
        await loadAttendanceRecords();
      } else {
        toast.warn(`掃描了 ${processed} 個檔案，但沒有新的資料需要更新。`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || '更新出勤資料失敗');
    } finally {
      setImporting(false);
    }
  }

  // Import attendance data for selected date (admin/hr only)
  // const importAttendanceData = async () => {
  //   if (!selectedDate) return;

  //   setImporting(true);
  //   setError(null);

  //   try {
  //     const response = await attendanceAPI.importByDate(selectedDate);
      
  //     if (response.data.imported > 0) {
  //       // Reload records after import
  //       await loadAttendanceRecords();
  //       alert(`成功匯入 ${response.data.imported} 筆出勤記錄`);
  //     } else {
  //       alert('未找到該日期的出勤資料檔案');
  //     }
  //   } catch (err: any) {
  //     setError(err.response?.data?.error || '匯入出勤資料失敗');
  //   } finally {
  //     setImporting(false);
  //   }
  // };

  // Load records when date range changes
  useEffect(() => {
    loadAttendanceRecords();
  }, [startDate, endDate]);

  // Quick date range setters
  const setDateRange = (days: number) => {
    const today = new Date();
    const pastDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    setStartDate(pastDate.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  // Check if user has admin/hr permissions (based on the user level system)
  const isAdminOrHr = user?.role === UserLevel.ADMIN || user?.role === UserLevel.HR; // 0=LAWYER/Admin, 1=CO_LAWYER/HR

  return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          出勤管理
        </Typography>

        {/* Date Range Selection and Controls */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={2}>
                <TextField
                  label="開始日期"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="結束日期"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setDateRange(0)}
                  >
                    今天
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setDateRange(7)}
                  >
                    7天
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setDateRange(30)}
                  >
                    30天
                  </Button>
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
                    onClick={manualupdateAttendanceData}
                    disabled={importing}
                  >
                    {importing ? '更新中...' : '更新資料'}
                  </Button>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  {startDate && endDate ? `${startDate} 至 ${endDate} 出勤記錄` : '請選擇日期範圍'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        
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
                          {loading ? '載入中...' : '該日期範圍無出勤記錄'}
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