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
import { attendanceAPI, variableAPI, employeeAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import { AttendanceRecord, UserLevel, Variable } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import StatusChip from './StatusChip';
import { fuzzySearchAttendance, toTaipeiDate } from '../../utility';

const AttendanceTab: React.FC = () => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 7 days ago
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]); // today
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showOnlyMyRecords, setShowOnlyMyRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showUnknownEmployees, setShowUnknownEmployees] = useState(false);
  const [departments, setDepartments] = useState<Variable[]>([]);

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return new Date(date.toLocaleDateString('zh-TW'));
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

  // Lookup department description by code
  const getDepartmentDescription = (departmentCode?: string): string => {
    if (!departmentCode) return '-';
    const department = departments.find(dept => dept.code === departmentCode);
    return department?.description || departmentCode;
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
      const data = response.data.data as any;

      // Separate data sets from API
      const attendanceRecords = data.attendance.records || [];
      const businessTrips = data.businesstrip.records || [];
      const postClocks = data.postclock.records || [];
      const holidays = data.holiday.records || [];

      // Fetch all employees to map cardID to employee info
      const employeesResponse = await employeeAPI.getAll(1, 10000); // High limit to get all employees
      const employees = employeesResponse.data.data.employees;
      const employeeMap = new Map(employees.map((e: any) => [e.cardID, e]));
      const empIDToCardID = new Map(employees.map((e: any) => [e.empID, e.cardID]));

      // Create holiday map for quick lookup
      const holidayMap = new Map(holidays.map((h: any) => [toTaipeiDate(h.date), h]));

      // Collect all unique employee-date combinations
      const recordMap = new Map<string, any>();

      // Helper function to get or create record
      const getOrCreateRecord = (empID: string, dateStr: string) => {
        const key = `${empID}_${dateStr}`;
        if (!recordMap.has(key)) {
          const cardID = empIDToCardID.get(empID);
          const employee = cardID ? employeeMap.get(cardID) : null;
          recordMap.set(key, {
            _id: key,
            cardID: cardID || '',
            empID: empID,
            employeeName: employee?.name,
            department: employee?.department,
            date: toTaipeiDate(dateStr),
            clockInTime: undefined,
            clockOutTime: undefined,
            clockInSource: "缺勤",
            clockOutSource: "缺勤",
            workDuration: undefined,
            status: undefined,
            holidayName: undefined,
            leaves: []
          });
        }
        return recordMap.get(key);
      };

      // Process attendance records
      attendanceRecords.forEach((att: any) => {
        const employee = employeeMap.get(att.cardID);
        if (!employee) return;

        const dateStr = toTaipeiDate(att.date);
        const record = getOrCreateRecord(employee.empID, dateStr);

        record.clockInTime = att.clockInTime;
        record.clockOutTime = att.clockOutTime;
        record.clockInSource = att.clockInTime ? '打卡' : "缺勤";
        record.clockOutSource = att.clockOutTime ? '打卡' : "缺勤";
      });

      // Process postClock records
      postClocks.forEach((pc: any) => {
        const dateStr = toTaipeiDate(pc.date);
        const record = getOrCreateRecord(pc.empID, dateStr);

        if (pc.clockType === 'in' && !record.clockInTime) {
          record.clockInTime = pc.time;
          record.clockInSource = '補單';
        } else if (pc.clockType === 'out' && !record.clockOutTime) {
          record.clockOutTime = pc.time;
          record.clockOutSource = '補單';
        }
      });

      // Process businessTrip records
      businessTrips.forEach((bt: any) => {
        const tripStart = new Date(bt.tripStart);
        const tripEnd = new Date(bt.tripEnd);

        // Generate all dates in the trip range
        for (let d = new Date(tripStart); d <= tripEnd; d.setDate(d.getDate() + 1)) {
          const dateStr = toTaipeiDate(d);
          const record = getOrCreateRecord(bt.empID, dateStr);

          if (!record.clockInTime) {
            record.clockInTime = bt.tripStart;
            record.clockInSource = '出差';
          }
          if (!record.clockOutTime) {
            record.clockOutTime = bt.tripEnd;
            record.clockOutSource = '出差';
          }
        }
      });

      // Process leave records - create records for leave days
      data.leave.records.forEach((leave: any) => {
        const leaveStart = new Date(leave.leaveStart);
        const leaveEnd = new Date(leave.leaveEnd);

        // Generate all dates in the leave range
        for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
          const dateStr = toTaipeiDate(d);
          const record = getOrCreateRecord(leave.empID, dateStr);

          // Mark as leave and store sequence number
          if (!record.status) {
            record.status = leave.leaveType || '請假';
          }
          // Add leave sequence number to the leaves array
          if (leave.sequenceNumber && !record.leaves.includes(leave.sequenceNumber)) {
            record.leaves.push(leave.sequenceNumber);
          }
        }
      });

      // Calculate work duration and add holiday info
      const aggregated = Array.from(recordMap.values()).map((record: any) => {
        // Calculate work duration if both clock times exist
        if (record.clockInTime && record.clockOutTime) {
          const inTime = new Date(record.clockInTime).getTime();
          const outTime = new Date(record.clockOutTime).getTime();
          const durationMinutes = (outTime - inTime) / (1000 * 60);
          record.workDuration = durationMinutes - 60 + 10; // -1hr lunch, +10min bonus
        }

        // Check if date is a holiday
        const dateStr = toTaipeiDate(record.date);
        const holiday = holidayMap.get(dateStr) as any;
        if (holiday) {
          record.status = holiday.name || '國定假日';
          record.holidayName = holiday.name;
        }

        return record;
      });

      setAttendanceRecords(aggregated);
      if (aggregated.length === 0) {
        toast.info('該日期範圍無出勤記錄');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || '載入出勤記錄失敗');
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
        if (!fuzzySearchAttendance(record, searchQuery, record.empID ?? "")) {
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
        '員工編號': record.empID || '-',
        '員工姓名': record.employeeName || '-',
        '部門名稱': getDepartmentDescription(record.department),
        '出勤日期': formatDate(new Date(record.date)),
        '上班出勤時間': formatTime(record.clockInTime),
        '上班出勤狀態': record.clockInSource || '-',
        '下班出勤時間': formatTime(record.clockOutTime),
        '下班出勤狀態': record.clockOutSource || '-',
        '工作時數': formatWorkDuration(record.workDuration),
        '狀態': record.holidayName ? record.status || record.holidayName : ''
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

  // Load departments on mount
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await variableAPI.getAll(undefined, false); // Only get active variables
        const allVariables = response.data.data.variables;
        const departmentVars = allVariables.filter((v: Variable) => v.section === 'department');
        setDepartments(departmentVars);
      } catch (err: any) {
        console.error('Failed to load departments:', err);
        // Don't show error toast as this is a background operation
      }
    };
    loadDepartments();
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
      flex: 1,
      valueGetter: (_, row) => row.cardID || '-'
    },
    {
      field: 'empID',
      headerName: '員工編號',
      flex: 1,
      valueGetter: (_, row) => row.empID || '-'
    },
    {
      field: 'employeeName',
      headerName: '員工姓名',
      flex: 1,
      valueGetter: (_, row) => row.employeeName || '-'
    },
    {
      field: 'department',
      headerName: '部門名稱',
      flex: 1,
      valueGetter: (_, row) => getDepartmentDescription(row.department)
    },
    {
      field: 'date',
      type: "date",
      headerName: '出勤日期',
      flex: 1,
      valueGetter: (_, row) => formatDate(new Date(row.date))
    },
    {
      field: 'clockInTime',
      headerName: '上班出勤時間',
      flex: 1,
      valueGetter: (_, row) => formatTime(row.clockInTime)
    },
    {
      field: 'clockInSource',
      headerName: '上班出勤狀態',
      flex: 1,
      valueGetter: (_, row) => row.clockInSource || '-'
    },
    {
      field: 'clockOutTime',
      headerName: '下班出勤時間',
      flex: 1,
      valueGetter: (_, row) => formatTime(row.clockOutTime)
    },
    {
      field: 'clockOutSource',
      headerName: '下班出勤狀態',
      flex: 1,
      valueGetter: (_, row) => row.clockOutSource || '-'
    },
    {
      field: 'workDuration',
      headerName: '工作時數',
      flex: 1,
      valueGetter: (_, row) => formatWorkDuration(row.workDuration)
    },
    {
      field: 'status',
      headerName: '出勤狀態',
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        return <>
          <Typography sx={{ display: "none" }}>
            JSON.stringify(params.row)
          </Typography>
          <StatusChip log={params.row} />
        </>;
      },
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
                  if (!fuzzySearchAttendance(record, searchQuery, record.empID ?? "")) {
                    return false;
                  }

                  return true;
                })
                .map((record, index) => ({
                  id: `${record.cardID}_${record.date}` || index,
                  ...record
                }))}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 50 },
                },
                sorting: {
                  sortModel: [{ field: 'date', sort: 'desc' }], // 'asc' or 'desc'
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