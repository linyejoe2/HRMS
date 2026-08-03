import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  CircularProgress,
  Alert
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { holidayService, CreateHolidayData } from '../../services/holidayService';

interface ImportHolidayModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ParsedHoliday {
  date: string;
  name: string;
}

export const ImportHolidayModal: React.FC<ImportHolidayModalProps> = ({
  open,
  onClose,
  onImported
}) => {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [parsedHolidays, setParsedHolidays] = useState<ParsedHoliday[]>([]);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse a single date string like "1/1" or "2/16"
  const parseDate = (dateStr: string, targetYear: number): string => {
    const parts = dateStr.trim().split('/');
    if (parts.length !== 2) {
      throw new Error(`無效的日期格式: ${dateStr}`);
    }
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error(`無效的日期: ${dateStr}`);
    }
    return `${targetYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Parse a date range like "2/16-2/20" and return all dates in the range
  const parseDateRange = (rangeStr: string, targetYear: number): string[] => {
    const parts = rangeStr.split('-');
    if (parts.length !== 2) {
      throw new Error(`無效的日期範圍格式: ${rangeStr}`);
    }
    const startDate = parseDate(parts[0], targetYear);
    const endDate = parseDate(parts[1], targetYear);

    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new Error(`日期範圍錯誤: ${rangeStr} (開始日期晚於結束日期)`);
    }

    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  // Parse file content
  const parseFileContent = (content: string, targetYear: number): ParsedHoliday[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const holidays: ParsedHoliday[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Match pattern: date or date-range followed by space and name
      // Examples: "1/1 元旦" or "2/16-2/20 春節"
      const match = trimmedLine.match(/^(\d+\/\d+(?:-\d+\/\d+)?)\s+(.+)$/);
      if (!match) {
        throw new Error(`無法解析行: "${trimmedLine}"`);
      }

      const dateOrRange = match[1];
      const name = match[2].trim();

      // Check if it's a range (contains -)
      if (dateOrRange.includes('-')) {
        const dates = parseDateRange(dateOrRange, targetYear);
        for (const date of dates) {
          holidays.push({ date, name });
        }
      } else {
        const date = parseDate(dateOrRange, targetYear);
        holidays.push({ date, name });
      }
    }

    return holidays;
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParseError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const holidays = parseFileContent(content, year);
        setParsedHolidays(holidays);
      } catch (error: any) {
        setParseError(error.message || '檔案解析失敗');
        setParsedHolidays([]);
      }
    };

    reader.onerror = () => {
      setParseError('無法讀取檔案');
      setParsedHolidays([]);
    };

    reader.readAsText(file, 'UTF-8');
  };

  // Handle year change and re-parse if file was selected
  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    // Clear parsed holidays when year changes - user needs to re-select file
    setParsedHolidays([]);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle import confirmation
  const handleConfirm = async () => {
    if (parsedHolidays.length === 0) {
      toast.error('沒有可匯入的假日');
      return;
    }

    setLoading(true);

    try {
      // Create all holidays one by one
      // All imported holidays are set to: is_paid=true, pay_rate=1, type='國定假日'
      for (const holiday of parsedHolidays) {
        const holidayData: CreateHolidayData = {
          date: holiday.date,
          name: holiday.name,
          type: '國定假日',
          is_paid: true,
          pay_rate: 1
        };

        try {
          await holidayService.createHoliday(holidayData);
        } catch (error: any) {
          // If holiday already exists on this date, update it
          if (error.response?.status === 400 && error.response?.data?.message?.includes('已存在')) {
            // Try to find and update the existing holiday
            const existingHolidays = await holidayService.getHolidaysByDateRange(holiday.date, holiday.date);
            if (existingHolidays.length > 0) {
              await holidayService.updateHoliday(existingHolidays[0]._id, holidayData);
            }
          } else {
            throw error;
          }
        }
      }

      toast.success(`成功匯入 ${parsedHolidays.length} 個假日`);
      onImported();
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '匯入失敗');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setParsedHolidays([]);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  // Trigger file input click
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>匯入假日</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="年份"
              type="number"
              value={year}
              onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
              sx={{ width: 120 }}
              inputProps={{ min: 2000, max: 2100 }}
            />
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={handleSelectFile}
            >
              選擇檔案
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </Box>

          <Typography variant="body2" color="text.secondary">
            檔案格式: 每行一個假日，格式為 "月/日 假日名稱" 或 "月/日-月/日 假日名稱"
          </Typography>

          {parseError && (
            <Alert severity="error">{parseError}</Alert>
          )}

          {parsedHolidays.length > 0 && (
            <>
              <Typography variant="subtitle1">
                共解析到 {parsedHolidays.length} 個假日:
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>日期</TableCell>
                      <TableCell>名稱</TableCell>
                      <TableCell>類型</TableCell>
                      <TableCell>支薪</TableCell>
                      <TableCell>支薪倍率</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsedHolidays.map((holiday, index) => (
                      <TableRow key={index}>
                        <TableCell>{holiday.date}</TableCell>
                        <TableCell>{holiday.name}</TableCell>
                        <TableCell>國定假日</TableCell>
                        <TableCell>是</TableCell>
                        <TableCell>1</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Alert severity="info">
                匯入後將覆蓋同日期的現有假日
              </Alert>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={loading || parsedHolidays.length === 0}
        >
          {loading ? <CircularProgress size={24} /> : '確定'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
