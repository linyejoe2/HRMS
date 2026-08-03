import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Box,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import toast from 'react-hot-toast';
import { holidayService, Holiday, HolidayType } from '../../services/holidayService';

interface HolidayModalProps {
  open: boolean;
  holiday: Holiday | null;
  onClose: () => void;
  onSaved: () => void;
}

const HOLIDAY_TYPES: HolidayType[] = ['國定假日', '例假日', '特殊假日'];

export const HolidayModal: React.FC<HolidayModalProps> = ({
  open,
  holiday,
  onClose,
  onSaved
}) => {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [type, setType] = useState<HolidayType>('國定假日');
  const [name, setName] = useState('');
  const [payRate, setPayRate] = useState<number>(1.0);
  const [isPaid, setIsPaid] = useState(true);
  const [memo, setMemo] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (holiday) {
      setDate(dayjs(holiday.date));
      setType(holiday.type);
      setName(holiday.name);
      setPayRate(holiday.pay_rate);
      setIsPaid(holiday.is_paid);
      setMemo(holiday.memo || '');
    } else {
      // Reset form for new holiday
      setDate(dayjs());
      setType('國定假日');
      setName('');
      setPayRate(1.0);
      setIsPaid(true);
      setMemo('');
    }
  }, [holiday, open]);

  const handleSubmit = async () => {
    // Validation
    if (!date) {
      toast.error('請選擇日期');
      return;
    }

    if (!name.trim()) {
      toast.error('請輸入假日名稱');
      return;
    }

    if (payRate < 0) {
      toast.error('支薪倍率不可為負數');
      return;
    }

    setLoading(true);

    try {
      const holidayData = {
        date: date.format('YYYY-MM-DD'),
        type,
        name: name.trim(),
        pay_rate: payRate,
        is_paid: isPaid,
        memo: memo.trim() || undefined
      };

      if (holiday?._id) {
        // Edit existing holiday
        await holidayService.updateHoliday(holiday._id, holidayData);
        toast.success('假日已更新');
      } else {
        // Create new holiday
        await holidayService.createHoliday(holidayData);
        toast.success('假日已建立');
      }

      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!holiday?._id) return;

    if (!window.confirm(`確定要刪除假日 "${holiday.name}" 嗎？`)) {
      return;
    }

    setLoading(true);

    try {
      await holidayService.deleteHoliday(holiday._id);
      toast.success('假日已刪除');
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '刪除失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {holiday ? '編輯假日' : '新增假日'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="日期"
              value={date}
              onChange={(newValue) => setDate(newValue)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true
                }
              }}
            />
          </LocalizationProvider>

          <FormControl fullWidth required>
            <InputLabel>類型</InputLabel>
            <Select
              value={type}
              label="類型"
              onChange={(e) => setType(e.target.value as HolidayType)}
            >
              {HOLIDAY_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="支薪倍率"
            type="number"
            value={payRate}
            onChange={(e) => setPayRate(Number(e.target.value))}
            fullWidth
            required
            inputProps={{ min: 0, step: 0.1 }}
            helperText="例如：1.0 = 正常支薪，2.0 = 雙倍薪資"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
              />
            }
            label="是否支薪"
          />

          <TextField
            label="備註"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: holiday ? 'space-between' : 'flex-end', px: 3, pb: 2 }}>
        {holiday && (
          <Button
            onClick={handleDelete}
            color="error"
            disabled={loading}
          >
            刪除
          </Button>
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (holiday ? '更新' : '建立')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
