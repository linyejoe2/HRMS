import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Grid
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { attendanceAPI } from '../../services/api';
import { AttendanceRecord, UserLevel } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import StatusChip from './StatusChip';
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
  const formatWorkDuration = (duration?: number) => {
    if (!duration) return '-';
    const wholeHours = Math.floor(duration / 60);
    const minutes = Math.round(duration % 60);
    return `${wholeHours}h ${minutes}m`;
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

  // DataGrid column definitions
  const columns: GridColDef[] = [
    {
      field: 'empID',
      headerName: '員工編號',
      // width: 120,
      flex: 1,
      valueGetter: (_, row) => row.empID || '-'
    },
    {
      field: 'employeeName',
      headerName: '員工姓名',
      // width: 150,
      flex: 1,
      valueGetter: (_, row) => row.employeeName || '-'
    },
    {
      field: 'department',
      headerName: '部門名稱',
      // width: 150,
      flex: 1,
      valueGetter: (_, row) => row.department || '-'
    },
    {
      field: 'date',
      headerName: '出勤日期',
      // width: 120,
      flex: 1,
      valueGetter: (_, row) => formatDate(new Date(row.date))
    },
    {
      field: 'clockInTime',
      headerName: '上班出勤時間',
      // width: 140,
      flex: 1,
      valueGetter: (_, row) => formatTime(row.clockInTime)
    },
    {
      field: 'clockInStatus',
      headerName: '上班出勤狀態',
      // width: 140,
      flex: 1,
      valueGetter: (_, row) => row.clockInStatus === 'D000' ? '打卡' : row.clockInStatus || '-'
    },
    {
      field: 'clockOutTime',
      headerName: '下班出勤時間',
      // width: 140,
      flex: 1,
      valueGetter: (_, row) => formatTime(row.clockOutTime)
    },
    {
      field: 'clockOutStatus',
      headerName: '下班出勤狀態',
      // width: 140,
      flex: 1,
      valueGetter: (_, row) => row.clockOutStatus === 'D900' ? '打卡' : row.clockOutStatus || '-'
    },
    {
      field: 'workDuration',
      headerName: '工作時數',
      // width: 120,
      flex: 1,
      valueGetter: (_, row) => formatWorkDuration(row.workDuration)
    },
    {
      field: 'status',
      headerName: '出勤狀態',
      // width: 120,
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <StatusChip log={params.row} />
      ),
    },
  ];

  return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          出勤管理
        </Typography>

        {/* Date Range Selection and Controls */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{
          "&:last-child": {
              p: 2
          }
        }}>
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

        {/* Attendance Records DataGrid */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              出勤記錄 ({attendanceRecords.length} 筆)
            </Typography>

            <Box sx={{ width: '100%' }}>
              <DataGrid
                rows={attendanceRecords.map((record, index) => ({
                  id: record._id || index,
                  ...record
                }))}
                columns={columns}
                initialState={{
                  pagination: {
                    paginationModel: { page: 0, pageSize: 50 },
                  },
                  filter: {
                    filterModel: {
                      items: [{ field: 'employeeName', operator: 'doesNotContain', value: '-' }]
                    }
                  }
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                checkboxSelection={false}
                disableRowSelectionOnClick
                loading={loading}
                sx={{
                  '& .MuiDataGrid-cell': {
                    borderRight: 1,
                    borderColor: 'divider',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: 'action.hover',
                    borderBottom: 2,
                    borderColor: 'divider',
                  },
                }}
                slots={{
                  noRowsOverlay: () => (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                      }}
                    >
                      <Typography color="text.secondary">
                        {loading ? '載入中...' : '該日期範圍無出勤記錄'}
                      </Typography>
                    </Box>
                  ),
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
  );
};

export default AttendanceTab;