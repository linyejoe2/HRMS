import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  Autocomplete,
  Stack,
  Divider,
  CircularProgress
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { Employee } from '../../types';
import { employeeAPI, leaveReportAPI } from '../../services/api';
import { toast } from 'react-toastify';

type DocumentType = 'leave_summary' | 'leave_record';

const LeaveDownloadTab: React.FC = () => {
  const [documentType, setDocumentType] = useState<DocumentType>('leave_summary');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('year'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('year'));
  const [loading, setLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // Generate year options (current year and past 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Load employees when document type changes to leave_record
  useEffect(() => {
    if (documentType === 'leave_record') {
      loadEmployees();
    }
  }, [documentType]);

  const loadEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const response = await employeeAPI.getAll(1, 1000);
      setEmployees(response.data.data.employees);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('無法載入員工列表');
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleYearQuickSelect = (year: number) => {
    setStartDate(dayjs(`${year}-01-01`));
    setEndDate(dayjs(`${year}-12-31`));
  };

  const handleDownload = async () => {
    try {
      setLoading(true);

      if (documentType === 'leave_summary') {
        const blob = await leaveReportAPI.downloadSummary(selectedYear);
        downloadBlob(blob, `請假總表_${selectedYear}.xlsx`);
        toast.success('請假總表下載成功');
      } else {
        if (!selectedEmployee) {
          toast.error('請選擇員工');
          return;
        }
        if (!startDate || !endDate) {
          toast.error('請選擇日期範圍');
          return;
        }

        const blob = await leaveReportAPI.downloadEmployeeReport(
          selectedEmployee.empID,
          startDate.format('YYYY-MM-DD'),
          endDate.format('YYYY-MM-DD')
        );
        downloadBlob(blob, `請假表_${selectedEmployee.empID}_${selectedEmployee.name}_${startDate.format('YYYYMMDD')}_${endDate.format('YYYYMMDD')}.xlsx`);
        toast.success('請假表下載成功');
      }
    } catch (error: any) {
      console.error('Error downloading report:', error);
      toast.error(error.response?.data?.message || '下載失敗');
    } finally {
      setLoading(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              表單下載
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              選擇要下載的表單類型和篩選條件
            </Typography>

            <Stack spacing={3}>
              {/* Document Type Selection */}
              <FormControl fullWidth>
                <InputLabel id="document-type-label">表單類型</InputLabel>
                <Select
                  labelId="document-type-label"
                  value={documentType}
                  label="表單類型"
                  onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                >
                  <MenuItem value="leave_summary">請假總表</MenuItem>
                  <MenuItem value="leave_record">請假表</MenuItem>
                </Select>
              </FormControl>

              <Divider />

              {/* Document-specific filters */}
              {documentType === 'leave_summary' && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    請假總表
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    匯出包含所有員工的年度休假統計，包含：員工編號、姓名、應休天數(特休)、可休時數(特休)、事假(已核准時數)、病假(已核准時數)
                  </Typography>

                  <FormControl fullWidth>
                    <InputLabel id="year-select-label">選擇年份</InputLabel>
                    <Select
                      labelId="year-select-label"
                      value={selectedYear}
                      label="選擇年份"
                      onChange={(e) => setSelectedYear(e.target.value as number)}
                    >
                      {yearOptions.map((year) => (
                        <MenuItem key={year} value={year}>
                          {year} 年
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}

              {documentType === 'leave_record' && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    請假表
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    匯出單一員工在指定期間內的所有已核准請假紀錄
                  </Typography>

                  <Stack spacing={2}>
                    {/* Employee Selection */}
                    <Autocomplete
                      options={employees}
                      getOptionLabel={(option) => `${option.empID} - ${option.name}`}
                      value={selectedEmployee}
                      onChange={(_, newValue) => setSelectedEmployee(newValue)}
                      loading={employeesLoading}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="選擇員工"
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {employeesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />

                    {/* Quick Year Selection */}
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        快速選擇年份：
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {yearOptions.slice(0, 4).map((year) => (
                          <Button
                            key={year}
                            variant="outlined"
                            size="small"
                            onClick={() => handleYearQuickSelect(year)}
                          >
                            {year} 年
                          </Button>
                        ))}
                      </Stack>
                    </Box>

                    {/* Date Range */}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <DatePicker
                        label="開始日期"
                        value={startDate}
                        onChange={(newValue) => setStartDate(newValue)}
                        slotProps={{
                          textField: { fullWidth: true }
                        }}
                      />
                      <DatePicker
                        label="結束日期"
                        value={endDate}
                        onChange={(newValue) => setEndDate(newValue)}
                        slotProps={{
                          textField: { fullWidth: true }
                        }}
                      />
                    </Stack>
                  </Stack>
                </Box>
              )}

              <Divider />

              {/* Download Button */}
              <Button
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                onClick={handleDownload}
                disabled={loading || (documentType === 'leave_record' && (!selectedEmployee || !startDate || !endDate))}
                sx={{ alignSelf: 'flex-start' }}
              >
                {loading ? '下載中...' : '下載 Excel'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default LeaveDownloadTab;
