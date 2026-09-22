import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  CircularProgress,
  Box,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-tw';
import { useForm, Controller } from 'react-hook-form';
import { BusinessTripRequestForm, Employee } from '../../types';
import { businessTripAPI, constantsAPI } from '../../services/api';
import { toast } from 'react-toastify';
import FileUploadField from '../common/FileUploadField';
import EmployeeAutocomplete from '../common/EmployeeAutocomplete';
import { useFileUpload } from '../../hooks/useFileUpload';

interface BusinessTripRequestModalProps {
  open: boolean;
  onClose: () => void;
  hrMode?: boolean; // when true, HR/admin creates the request on behalf of a chosen employee (代理申請); it still goes through the normal manager/HR approval workflow
}

interface ClockTimeRow {
  clockIn: Dayjs | null;
  clockOut: Dayjs | null;
  isWorkDay: boolean;
  day: Dayjs; // calendar day this row belongs to; clockIn/clockOut are restricted to within it
}

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// Mirrors backend's buildDefaultClockTimes / BusinessTripClockTimesModal: one row per
// day of the trip, using the real trip start/end on the first/last day and the
// standard work hours in between.
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

const BusinessTripRequestModal: React.FC<BusinessTripRequestModalProps> = ({ open, onClose, hrMode = false }) => {
  const [loading, setLoading] = useState(false);
  const { files, setFiles, clearFiles } = useFileUpload();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [clockRows, setClockRows] = useState<ClockTimeRow[]>([]);
  const [workingTime, setWorkingTime] = useState<{
    workStart: { hour: number; minute: number };
    workEnd: { hour: number; minute: number };
  } | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<BusinessTripRequestForm & { tripStartObj: Dayjs | null, tripEndObj: Dayjs | null }>({
    defaultValues: {
      destination: '',
      contactPerson: '',
      purpose: '',
      tripStart: dayjs().hour(8).minute(30).second(0).toISOString(),
      tripEnd: dayjs().hour(17).minute(20).second(0).toISOString(),
      transportation: '',
      estimatedCost: undefined,
      notes: '',
      rejectionReason: '',
      tripStartObj: null,
      tripEndObj: null
    }
  });

  const tripStart = watch('tripStart');
  const tripEnd = watch('tripEnd');

  // Load standard work hours once, used to seed the default clock-in/out per day
  useEffect(() => {
    if (!open) return;
    let active = true;
    constantsAPI.getAll()
      .then(response => {
        if (active) setWorkingTime(response.data.data.workingTime);
      })
      .catch(error => console.error('Error loading working time constants:', error));
    return () => {
      active = false;
    };
  }, [open]);

  // Regenerate the per-day clock-in/out rows whenever the trip dates (or the loaded
  // work hours) change, mirroring how BusinessTripClockTimesModal seeds defaults.
  useEffect(() => {
    if (!open || !workingTime || !tripStart || !tripEnd) return;
    const startDate = dayjs(tripStart);
    const endDate = dayjs(tripEnd);
    if (!startDate.isValid() || !endDate.isValid() || endDate.isBefore(startDate)) return;
    setClockRows(buildDefaultRows(startDate, endDate, workingTime.workStart, workingTime.workEnd));
  }, [open, workingTime, tripStart, tripEnd]);

  // Merges the picked time-of-day with the row's fixed calendar day, since the
  // pickers now only select a time (the date is implied by the row itself).
  const mergeTimeWithDay = (day: Dayjs, value: Dayjs | null): Dayjs | null =>
    value ? day.hour(value.hour()).minute(value.minute()).second(0).millisecond(0) : null;

  const handleClockInChange = (index: number, value: Dayjs | null) => {
    setClockRows(prev => prev.map((row, i) => (i === index ? { ...row, clockIn: mergeTimeWithDay(row.day, value) } : row)));
  };

  const handleClockOutChange = (index: number, value: Dayjs | null) => {
    setClockRows(prev => prev.map((row, i) => (i === index ? { ...row, clockOut: mergeTimeWithDay(row.day, value) } : row)));
  };

  const handleWorkDayToggle = (index: number) => {
    setClockRows(prev => prev.map((row, i) => (i === index ? { ...row, isWorkDay: !row.isWorkDay } : row)));
  };

  // Non-work days don't need valid clock times since they're excluded from submission
  const isClockRowInvalid = (row: ClockTimeRow) =>
    row.isWorkDay && (!row.clockIn || !row.clockOut || !row.clockOut.isAfter(row.clockIn));

  const hasInvalidClockRow = clockRows.some(isClockRowInvalid);

  const onSubmit = async (data: BusinessTripRequestForm & { tripStartObj: Dayjs | null, tripEndObj: Dayjs | null }) => {
    try {
      if (hrMode && !selectedEmployee) {
        toast.error('請選擇員工');
        return;
      }

      // Validate dates
      const startDate = dayjs(data.tripStart);
      const endDate = dayjs(data.tripEnd);

      if (endDate.isBefore(startDate)) {
        toast.error('返回時間不能早於出發時間');
        return;
      }

      const workDayRows = clockRows.filter(row => row.isWorkDay);

      if (workDayRows.length === 0) {
        toast.error('請至少選擇一個工作日');
        return;
      }

      if (hasInvalidClockRow) {
        toast.error('請確認出差期間每日上下班時間，下班時間必須晚於上班時間');
        return;
      }

      setLoading(true);

      const submitData: BusinessTripRequestForm = {
        destination: data.destination,
        contactPerson: data.contactPerson,
        purpose: data.purpose,
        tripStart: startDate.toISOString(),
        tripEnd: endDate.toISOString(),
        transportation: data.transportation,
        estimatedCost: data.estimatedCost,
        notes: data.notes,
        clockTimes: workDayRows.map(row => ({
          clockIn: row.clockIn!.toISOString(),
          clockOut: row.clockOut!.toISOString()
        })),
        rejectionReason: hrMode ? data.rejectionReason : undefined,
        supportingInfo: files.length > 0 ? files : undefined
      };

      await businessTripAPI.create(submitData, hrMode ? selectedEmployee!.empID : undefined);
      toast.success(hrMode ? '因公免刷卡申請已代理申請成功' : '因公免刷卡申請已成功送出');
      reset();
      clearFiles();
      setSelectedEmployee(null);
      setClockRows([]);
      onClose();
    } catch (error: any) {
      console.error('Error creating business trip request:', error);
      const message = error.response?.data?.message || '建立因公免刷卡申請失敗';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      reset();
      clearFiles();
      setSelectedEmployee(null);
      setClockRows([]);
      onClose();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="zh-tw">
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            {hrMode ? '代理申請因公免刷卡' : '建立因公免刷卡申請'}
          </Typography>
        </DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={3}>
              {hrMode && (
                <Grid item xs={12}>
                  <EmployeeAutocomplete
                    value={selectedEmployee}
                    onChange={setSelectedEmployee}
                    label="員工"
                    required
                  />
                </Grid>
              )}

              <Grid item xs={12} md={4}>
                <Controller
                  name="destination"
                  control={control}
                  rules={{ required: '請填寫因公免刷卡目的地' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="因公免刷卡目的地"
                      fullWidth
                      error={!!errors.destination}
                      helperText={errors.destination?.message}
                      placeholder="例如：台北、高雄、上海..."
                      required
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="contactPerson"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="洽辦對象"
                      fullWidth
                      error={!!errors.contactPerson}
                      helperText={errors.contactPerson?.message}
                      placeholder="例如：出差地點的聯絡窗口"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="transportation"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="交通方式"
                      fullWidth
                      error={!!errors.transportation}
                      helperText={errors.transportation?.message}
                      placeholder="例如：搭捷運、搭高鐵、開車..."
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="tripStart"
                  control={control}
                  rules={{ required: '請選擇出發時間' }}
                  render={({ field: { onChange, value } }) => (
                    <DateTimePicker
                      label="出發時間"
                      value={dayjs(value)}
                      onChange={(newValue) => {
                        onChange(newValue?.toISOString() || '');
                      }}
                      ampm={false}
                      timeSteps={{ minutes: 1 }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.tripStart,
                          helperText: errors.tripStart?.message,
                          required: true
                        }
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="tripEnd"
                  control={control}
                  rules={{ required: '請選擇返回時間' }}
                  render={({ field: { onChange, value } }) => (
                    <DateTimePicker
                      label="返回時間"
                      value={dayjs(value)}
                      onChange={(newValue) => {
                        onChange(newValue?.toISOString() || '');
                      }}
                      minDateTime={tripStart ? dayjs(tripStart) : undefined}
                      timeSteps={{ minutes: 1 }}
                      ampm={false}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.tripEnd,
                          helperText: errors.tripEnd?.message,
                          required: true
                        }
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  出差期間上下班時間
                </Typography>
                {clockRows.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    請先選擇出發與返回時間
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {clockRows.map((row, index) => (
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
                            <Typography variant="body2" color="text.secondary">
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
                                error: isClockRowInvalid(row),
                                helperText: isClockRowInvalid(row) ? '下班時間必須晚於上班時間' : undefined
                              }
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Grid>

              {hrMode && (
                <Grid item xs={12}>
                  <Controller
                    name="rejectionReason"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="說明"
                        multiline
                        rows={2}
                        fullWidth
                        helperText="選填：代辦人可填寫的備註"
                      />
                    )}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <Controller
                  name="purpose"
                  control={control}
                  rules={{ required: '請填寫因公免刷卡目的' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="因公免刷卡目的"
                      multiline
                      rows={3}
                      fullWidth
                      error={!!errors.purpose}
                      helperText={errors.purpose?.message}
                      placeholder="請說明因公免刷卡的目的與行程..."
                      required
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <FileUploadField
                  files={files}
                  onFilesChange={setFiles}
                  label="相關資料 (選填)"
                  helperText="可上傳多個檔案作為因公免刷卡證明"
                  disabled={loading}
                />
              </Grid>

              {/* <Grid item xs={12} md={6}>
                <Controller
                  name="estimatedCost"
                  control={control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="預估費用"
                      fullWidth
                      value={value || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChange(val ? Number(val) : undefined);
                      }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">NT$</InputAdornment>,
                      }}
                      error={!!errors.estimatedCost}
                      helperText={errors.estimatedCost?.message || '選填：包含交通、住宿、餐費等'}
                    />
                  )}
                />
              </Grid> */}

              {/* <Grid item xs={12} md={6}>
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="備註"
                      multiline
                      rows={2}
                      fullWidth
                      helperText="選填：其他需要說明的事項"
                    />
                  )}
                />
              </Grid> */}
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              onClick={handleClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              data-id="b3818a4d-36ac-48b0-83ee-7a8b747aacad"
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? '建立中...' : hrMode ? '代理申請' : '建立申請'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
};

export default BusinessTripRequestModal;
