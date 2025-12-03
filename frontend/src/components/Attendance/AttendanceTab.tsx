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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { attendanceAPI, employeeAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import { AttendanceRecord, UserLevel, Employee } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import StatusChip from './StatusChip';
import { fuzzySearchAttendance } from '../../utility';

const AttendanceTab: React.FC = () => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 7 days ago
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]); // today
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showOnlyMyRecords, setShowOnlyMyRecords] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showUnknownEmployees, setShowUnknownEmployees] = useState(false);

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-TW')
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

  // Lookup empID by cardID
  const getEmpIDByCardID = (cardID: string): string => {
    const employee = employees.find(emp => emp.cardID === cardID);
    return employee?.empID || '...';
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

      if (res.data.error) {
        toast.error(res.data.message || '無法更新資料');
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
      toast.error(err.response?.data?.message || '更新出勤資料失敗');
    } finally {
      setImporting(false);
    }
  }

  // Download attendance records as Excel
  const downloadAsExcel = () => {
    try {
      // Filter records based on current filters
      const filteredRecords = attendanceRecords.filter(record => {
        // Filter: Only show my records if checked
        if (showOnlyMyRecords && record.cardID !== user?.cardID) {
          return false;
        }

        // Filter: Show/hide unknown employees
        if (!showUnknownEmployees && !record.employeeName) {
          return false;
        }

        // Filter: Fuzzy search by cardID, empID, employeeName, department
        const empID = getEmpIDByCardID(record.cardID);
        if (!fuzzySearchAttendance(record, searchQuery, empID)) {
          return false;
        }

        return true;
      });

      if (filteredRecords.length === 0) {
        toast.warning('沒有資料可以下載');
        return;
      }

      // Prepare data for Excel
      const excelData = filteredRecords.map(record => ({
        '卡號': record.cardID || '-',
        '員工編號': getEmpIDByCardID(record.cardID),
        '員工姓名': record.employeeName || '-',
        '部門名稱': record.department || '-',
        '出勤日期': formatDate(new Date(record.date)),
        '上班出勤時間': formatTime(record.clockInTime),
        '上班出勤狀態': record.clockInStatus === 'D000' ? '打卡' : record.clockInStatus || '-',
        '下班出勤時間': formatTime(record.clockOutTime),
        '下班出勤狀態': record.clockOutStatus === 'D900' ? '打卡' : record.clockOutStatus || '-',
        '工作時數': formatWorkDuration(record.workDuration),
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const columnWidths = [
        { wch: 12 }, // 卡號
        { wch: 12 }, // 員工編號
        { wch: 15 }, // 員工姓名
        { wch: 15 }, // 部門名稱
        { wch: 12 }, // 出勤日期
        { wch: 15 }, // 上班出勤時間
        { wch: 15 }, // 上班出勤狀態
        { wch: 15 }, // 下班出勤時間
        { wch: 15 }, // 下班出勤狀態
        { wch: 12 }, // 工作時數
      ];
      worksheet['!cols'] = columnWidths;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '出勤記錄');

      // Generate filename
      const filename = `${startDate}_${endDate}_attendance_record.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);

      toast.success(`成功下載 ${filteredRecords.length} 筆記錄`);
    } catch (err: any) {
      console.error('Excel download error:', err);
      toast.error('下載 Excel 檔案失敗');
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

  // Load employees on mount
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await employeeAPI.getAll(1, 9999); // Get all employees
        if (!response.data.error) {
          setEmployees(response.data.data.employees);
        }
      } catch (err: any) {
        console.error('Failed to load employees:', err);
        // Don't show error toast as this is a background operation
      }
    };
    loadEmployees();
  }, []);

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

  // Check if user has admin/hr/manager permissions
  const isAdminOrHr = user?.role === UserLevel.ADMIN || user?.role === UserLevel.HR;
  const isAdminOrHrOrManager = isAdminOrHr || user?.role === UserLevel.MANAGER;

  // DataGrid column definitions
  const columns: GridColDef[] = [
    {
      field: 'cardID',
      headerName: '卡號',
      // width: 120,
      flex: 1,
      valueGetter: (_, row) => row.cardID || '-'
    },
    {
      field: 'empID',
      headerName: '員工編號',
      // width: 120,
      flex: 1,
      valueGetter: (_, row) => getEmpIDByCardID(row.cardID)
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
            <Grid item xs={12} md={6}>
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
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<FileDownloadIcon />}
                  onClick={downloadAsExcel}
                  disabled={loading || attendanceRecords.length === 0}
                >
                  下載成 Excel
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary">
                {startDate && endDate ? `${startDate} 至 ${endDate} 出勤記錄` : '請選擇日期範圍'}
              </Typography>
            </Grid>

            {/* Second Line: Filter Controls for Admin/HR/Manager */}
            {isAdminOrHrOrManager && (
              <>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="搜尋"
                    placeholder="輸入卡號、員工編號、姓名或部門 (空格分隔多個關鍵字)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: "wrap" }}>
                    <Button
                      variant={showOnlyMyRecords ? "contained" : "outlined"}
                      onClick={() => setShowOnlyMyRecords(!showOnlyMyRecords)}
                    >
                      只看自己
                    </Button>
                    <Button
                      variant={showUnknownEmployees ? "contained" : "outlined"}
                      onClick={() => setShowUnknownEmployees(!showUnknownEmployees)}
                    >
                      顯示不明員工
                    </Button>
                  </Box>
                </Grid>
              </>
            )}
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
              rows={attendanceRecords
                .filter(record => {
                  // Filter: Only show my records if checked
                  if (showOnlyMyRecords && record.cardID !== user?.cardID) {
                    return false;
                  }

                  // Filter: Show/hide unknown employees
                  if (!showUnknownEmployees && !record.employeeName) {
                    return false;
                  }

                  // Filter: Fuzzy search by cardID, empID, employeeName, department
                  const empID = getEmpIDByCardID(record.cardID);
                  if (!fuzzySearchAttendance(record, searchQuery, empID)) {
                    return false;
                  }

                  return true;
                })
                .map((record, index) => ({
                  id: record._id || index,
                  ...record
                }))}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 50 },
                },
                // filter: {
                //   filterModel: {
                //     items: [{ field: 'employeeName', operator: 'doesNotContain', value: '-' }]
                //   }
                // }
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