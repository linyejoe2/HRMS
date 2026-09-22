import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs, { Dayjs } from 'dayjs';
import { toast } from 'react-toastify';
import { businessTripAPI, constantsAPI } from '../../services/api';
import { BusinessTripRequest } from '../../types';

interface BusinessTripClockTimesModalProps {
  open: boolean;
  onClose: () => void;
  request: BusinessTripRequest | null;
  onSaved: () => void;
}

interface ClockTimeRow {
  clockIn: Dayjs | null;
  clockOut: Dayjs | null;
  isWorkDay: boolean;
  day: Dayjs; // calendar day this row belongs to; clockIn/clockOut are restricted to within it
}

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// Mirrors backend's buildDefaultClockTimes: one row per day of the trip, using the
// real trip start/end on the first/last day and the standard work hours in between.
const buildDefaultRows = (
  tripStart: Dayjs,
  tripEnd: Dayjs,
  workStart: { hour: number; minute: number },
  workEnd: { hour: number; minute: number }
): ClockTimeRow[] => {
  const firstDay = tripStart.startOf('day');
  const lastDay = tripEnd.startOf('day');
  const rows: ClockTimeRow[] = [];

  for (let cursor = firstDay; !cursor.isAfter(lastDay); cursor = cursor.add(1, 'day')) {
    const isFirstDay = cursor.isSame(firstDay, 'day');
    const isLastDay = cursor.isSame(lastDay, 'day');
    const clockIn = isFirstDay
      ? tripStart
      : cursor.hour(workStart.hour).minute(workStart.minute).second(0).millisecond(0);
    const clockOut = isLastDay
      ? tripEnd
      : cursor.hour(workEnd.hour).minute(workEnd.minute).second(0).millisecond(0);
    // Default Saturday/Sunday to non-work days; still toggleable by the employee
    const isWorkDay = cursor.day() !== 0 && cursor.day() !== 6;
    rows.push({ clockIn, clockOut, isWorkDay, day: cursor });
  }

  return rows;
};

const BusinessTripClockTimesModal: React.FC<BusinessTripClockTimesModalProps> = ({
  open,
  onClose,
  request,
  onSaved
}) => {
  const [rows, setRows] = useState<ClockTimeRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !request) {
      setRows([]);
      return;
    }

    if (request.clockTimes && request.clockTimes.length > 0) {
      setRows(
        request.clockTimes.map(entry => ({
          clockIn: dayjs(entry.clockIn),
          clockOut: dayjs(entry.clockOut),
          isWorkDay: true,
          day: dayjs(entry.clockIn).startOf('day')
        }))
      );
      return;
    }

    // No clockTimes recorded yet (e.g. a request created before this feature
    // existed) — initialize one row per day using the same default logic
    // applied at request creation.
    let active = true;
    constantsAPI.getAll()
      .then(response => {
        if (!active) return;
        const { workStart, workEnd } = response.data.data.workingTime;
        setRows(buildDefaultRows(dayjs(request.tripStart), dayjs(request.tripEnd), workStart, workEnd));
      })
      .catch(() => {
        if (active) setRows([{
          clockIn: dayjs(request.tripStart),
          clockOut: dayjs(request.tripEnd),
          isWorkDay: true,
          day: dayjs(request.tripStart).startOf('day')
        }]);
      });

    return () => {
      active = false;
    };
  }, [open, request]);

  // Merges the picked time-of-day with the row's fixed calendar day, since the
  // pickers now only select a time (the date is implied by the row itself).
  const mergeTimeWithDay = (day: Dayjs, value: Dayjs | null): Dayjs | null =>
    value ? day.hour(value.hour()).minute(value.minute()).second(0).millisecond(0) : null;

  const handleClockInChange = (index: number, value: Dayjs | null) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, clockIn: mergeTimeWithDay(row.day, value) } : row)));
  };

  const handleClockOutChange = (index: number, value: Dayjs | null) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, clockOut: mergeTimeWithDay(row.day, value) } : row)));
  };

  const handleWorkDayToggle = (index: number) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, isWorkDay: !row.isWorkDay } : row)));
  };

  // Non-work days don't need valid clock times since they're excluded from saving
  const isRowInvalid = (row: ClockTimeRow) =>
    row.isWorkDay && (!row.clockIn || !row.clockOut || !row.clockOut.isAfter(row.clockIn));

  const hasInvalidRow = rows.some(isRowInvalid);
  const workDayRows = rows.filter(row => row.isWorkDay);

  const handleSave = async () => {
    if (!request?._id || hasInvalidRow || workDayRows.length === 0) return;

    setSaving(true);
    try {
      await businessTripAPI.updateClockTimes(
        request._id,
        workDayRows.map(row => ({
          clockIn: row.clockIn!.toISOString(),
          clockOut: row.clockOut!.toISOString()
        }))
      );
      toast.success('上下班時間已更新');
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Error updating business trip clock times:', error);
      toast.error(error.response?.data?.message || '更新上下班時間失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>填寫/修改出差期間上下班時間</DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {rows.map((row, index) => (
              <Box key={index}>
                {index > 0 && <Divider sx={{ mb: 2 }} />}
                <FormControlLabel
                  sx={{ ml: 0, mb: 0.5 }}
                  control={
                    <Switch
                      size="small"
                      checked={row.isWorkDay}
                      onChange={() => handleWorkDayToggle(index)}
                    />
                  }
                  label={
                    <Typography variant="subtitle2" color="text.secondary">
                      第 {index + 1} 天 {row.clockIn ? `${WEEKDAY_NAMES[row.clockIn.day()]}（${row.clockIn.format('YYYY/MM/DD')}）` : ''}
                      {!row.isWorkDay && '（非工作日）'}
                    </Typography>
                  }
                />
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TimePicker
                    label="上班時間"
                    value={row.clockIn}
                    onChange={(value) => handleClockInChange(index, value)}
                    format="HH:mm"
                    timeSteps={{ minutes: 1 }}
                    ampm={false}
                    disabled={!row.isWorkDay}
                    slotProps={{
                      textField: {
                        required: row.isWorkDay,
                        fullWidth: true,
                        sx: { minWidth: 220, flex: 1 }
                      }
                    }}
                  />
                  <TimePicker
                    label="下班時間"
                    value={row.clockOut}
                    onChange={(value) => handleClockOutChange(index, value)}
                    format="HH:mm"
                    timeSteps={{ minutes: 1 }}
                    ampm={false}
                    minTime={row.clockIn ?? undefined}
                    disabled={!row.isWorkDay}
                    slotProps={{
                      textField: {
                        required: row.isWorkDay,
                        fullWidth: true,
                        sx: { minWidth: 220, flex: 1 },
                        error: isRowInvalid(row),
                        helperText: isRowInvalid(row) ? '下班時間必須晚於上班時間' : undefined
                      }
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          取消
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || hasInvalidRow || workDayRows.length === 0}
        >
          {saving ? '儲存中...' : '儲存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BusinessTripClockTimesModal;
