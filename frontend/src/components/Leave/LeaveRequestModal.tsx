import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';
import { useForm, Controller } from 'react-hook-form';
import { LeaveRequestForm } from '../../types';
import { createLeaveRequest } from '../../services/api';
import { toast } from 'react-toastify';
import FileUploadField from '../common/FileUploadField';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useAuth } from '../../contexts/AuthContext';
import { fetchUserLeaveData } from '../../services/leaveService';
import { calcWorkingDuration } from '@/services/workingTimeCalcService';

interface LeaveRequestModalProps {
  open: boolean;
  onClose: () => void;
}

const leaveTypes = [
  '普通傷病假',
  '事假',
  '特別休假',
  '婚假',
  '喪假',
  '生理假',
  '普通傷病假(住院)',
  '公傷病假',
  '公假',
  '產假',
  '產檢假',
  '陪產檢及陪產假',
  '家庭照顧假',
  '安胎休養請假',
  '育嬰留職停薪'
];

const startTimeOptions = [
  { value: '08:30', label: '08:30' },
  { value: '13:00', label: '13:00' }
];

const endTimeOptions = [
  { value: '12:00', label: '12:00' },
  { value: '17:30', label: '17:30' }
];

interface LeaveFormData extends Omit<LeaveRequestForm, 'leaveStart' | 'leaveEnd'> {
  leaveStartDate: string;
  leaveStartTime: string;
  leaveEndDate: string;
  leaveEndTime: string;
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const { files, setFiles, clearFiles } = useFileUpload();
  const { user } = useAuth();
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<LeaveRequestForm | null>(null);
  const [warningMessage, setWarningMessage] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    clearErrors,
    formState: { errors }
  } = useForm<LeaveFormData>({
    defaultValues: {
      leaveType: '',
      reason: '',
      leaveStartDate: dayjs().format('YYYY-MM-DD'),
      leaveStartTime: '08:30',
      leaveEndDate: dayjs().format('YYYY-MM-DD'),
      leaveEndTime: '17:30'
    }
  });

  const leaveStartDate = watch('leaveStartDate');
  const leaveStartTime = watch('leaveStartTime');
  const leaveEndDate = watch('leaveEndDate');
  const leaveEndTime = watch('leaveEndTime');

  // Validate date/time combination
  React.useEffect(() => {
    if (!leaveStartDate || !leaveEndDate || !leaveStartTime || !leaveEndTime) {
      return;
    }

    const startDate = dayjs(leaveStartDate);
    const endDate = dayjs(leaveEndDate);

    // Check if end date is before start date
    if (endDate.isBefore(startDate, 'day')) {
      setError('leaveEndDate', {
        type: 'manual',
        message: '結束日期不能早於開始日期'
      });
      return;
    } else {
      clearErrors('leaveEndDate');
    }

    // If same date, check time
    if (startDate.isSame(endDate, 'day')) {
      const [startHour, startMinute] = leaveStartTime.split(':').map(Number);
      const [endHour, endMinute] = leaveEndTime.split(':').map(Number);

      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;

      if (endTimeMinutes <= startTimeMinutes) {
        setError('leaveEndTime', {
          type: 'manual',
          message: '同一天的結束時間必須晚於開始時間'
        });
        return;
      } else {
        clearErrors('leaveEndTime');
      }
    } else {
      clearErrors('leaveEndTime');
    }
  }, [leaveStartDate, leaveStartTime, leaveEndDate, leaveEndTime, setError, clearErrors]);

  // Check leave balance
  const checkLeaveBalance = async (data: LeaveRequestForm): Promise<boolean> => {
    if (!user?.empID || !user?.hireDate) {
      return true; // Skip validation if user info not available
    }

    const leaveTypesToCheck = ['事假', '普通傷病假', '特別休假'];
    if (!leaveTypesToCheck.includes(data.leaveType)) {
      return true; // Skip validation for other leave types
    }

    try {
      const leaveData = await fetchUserLeaveData(user.empID, user.hireDate);
      const workingDurentObj = calcWorkingDuration(data.leaveStart, data.leaveEnd, { useStandard4HourBlocks: true });
      const requestedHours = workingDurentObj.hourFormat

      let remainingHours = 0;
      let leaveTypeName = '';

      switch (data.leaveType) {
        case '事假':
          remainingHours = leaveData.personalLeave.remainingHours;
          leaveTypeName = '事假';
          break;
        case '普通傷病假':
          remainingHours = leaveData.sickLeave.remainingHours;
          leaveTypeName = '病假';
          break;
        case '特別休假':
          remainingHours = leaveData.specialLeave.remainingHours;
          leaveTypeName = '特休';
          break;
      }

      if (requestedHours > remainingHours) {
        setWarningMessage(
          `您的${leaveTypeName}剩餘時數為 ${remainingHours.toFixed(1)} 小時，` +
          `但此次申請需要 ${requestedHours.toFixed(1)} 小時。\n\n` +
          `超出額度 ${(requestedHours - remainingHours).toFixed(1)} 小時。\n\n` +
          `您仍然可以繼續送出申請，但可能需要額外的審核。`
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking leave balance:', error);
      return true; // Continue if check fails
    }
  };

  const onSubmit = async (formData: LeaveFormData) => {
    // Combine date and time into ISO format
    const [startHour, startMinute] = formData.leaveStartTime.split(':').map(Number);
    const [endHour, endMinute] = formData.leaveEndTime.split(':').map(Number);

    const leaveStart = dayjs(formData.leaveStartDate)
      .hour(startHour)
      .minute(startMinute)
      .second(0)
      .toISOString();

    const leaveEnd = dayjs(formData.leaveEndDate)
      .hour(endHour)
      .minute(endMinute)
      .second(0)
      .toISOString();

    const data: LeaveRequestForm = {
      leaveType: formData.leaveType,
      reason: formData.reason ?? "",
      leaveStart,
      leaveEnd
    };

    // Check leave balance first
    const hasSufficientBalance = await checkLeaveBalance(data);

    if (!hasSufficientBalance) {
      // Show warning dialog but allow submission
      setPendingSubmitData(data);
      setWarningDialogOpen(true);
      return;
    }

    // Sufficient balance, proceed with submission
    await performSubmit(data);
  };

  const performSubmit = async (data: LeaveRequestForm) => {
    try {
      setLoading(true);
      const submitData: LeaveRequestForm = {
        ...data,
        supportingInfo: files.length > 0 ? files : undefined
      };
      await createLeaveRequest(submitData);
      toast.success('請假申請已成功送出');
      reset({
        leaveType: '',
        reason: '',
        leaveStartDate: dayjs().format('YYYY-MM-DD'),
        leaveStartTime: '08:30',
        leaveEndDate: dayjs().format('YYYY-MM-DD'),
        leaveEndTime: '17:30'
      });
      clearFiles();
      setPendingSubmitData(null);
      onClose();
    } catch (error: any) {
      console.error('Error creating leave request:', error);
      const message = error.response?.data?.message || '建立請假申請失敗';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleWarningConfirm = async () => {
    setWarningDialogOpen(false);
    if (pendingSubmitData) {
      await performSubmit(pendingSubmitData);
    }
  };

  const handleClose = () => {
    if (!loading) {
      reset({
        leaveType: '',
        reason: '',
        leaveStartDate: dayjs().format('YYYY-MM-DD'),
        leaveStartTime: '08:30',
        leaveEndDate: dayjs().format('YYYY-MM-DD'),
        leaveEndTime: '17:30'
      });
      clearFiles();
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
            建立請假申請
          </Typography>
        </DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container rowSpacing={3} columnSpacing={1} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Controller
                  name="leaveType"
                  control={control}
                  rules={{ required: '請選擇請假類型' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="請假類型"
                      fullWidth
                      error={!!errors.leaveType}
                      helperText={errors.leaveType?.message}
                      required
                    >
                      {leaveTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="reason"
                  control={control}
                  // rules={{ required: '請填寫請假原因' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="請假原因"
                      multiline
                      rows={3}
                      fullWidth
                      error={!!errors.reason}
                      helperText={errors.reason?.message}
                    // required
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="leaveStartDate"
                  control={control}
                  rules={{ required: '請選擇請假開始日期' }}
                  render={({ field: { onChange, value } }) => (
                    <DatePicker
                      label="請假開始日期"
                      value={dayjs(value)}
                      onChange={(newValue) => {
                        onChange(newValue?.format('YYYY-MM-DD') || '');
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.leaveStartDate,
                          helperText: errors.leaveStartDate?.message,
                          required: true
                        }
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <Controller
                  name="leaveStartTime"
                  control={control}
                  rules={{ required: '請選擇開始時間' }}
                  render={({ field }) => (
                    <FormControl fullWidth required error={!!errors.leaveStartTime}>
                      <InputLabel>開始時間</InputLabel>
                      <Select
                        {...field}
                        label="開始時間"
                      >
                        {startTimeOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.leaveStartTime && (
                        <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                          {errors.leaveStartTime.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="leaveEndDate"
                  control={control}
                  rules={{ required: '請選擇請假結束日期' }}
                  render={({ field: { onChange, value } }) => (
                    <DatePicker
                      label="請假結束日期"
                      value={dayjs(value)}
                      onChange={(newValue) => {
                        onChange(newValue?.format('YYYY-MM-DD') || '');
                      }}
                      minDate={leaveStartDate ? dayjs(leaveStartDate) : undefined}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.leaveEndDate,
                          helperText: errors.leaveEndDate?.message,
                          required: true
                        }
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <Controller
                  name="leaveEndTime"
                  control={control}
                  rules={{ required: '請選擇結束時間' }}
                  render={({ field }) => (
                    <FormControl fullWidth required error={!!errors.leaveEndTime}>
                      <InputLabel>結束時間</InputLabel>
                      <Select
                        {...field}
                        label="結束時間"
                      >
                        {endTimeOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.leaveEndTime && (
                        <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                          {errors.leaveEndTime.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <FileUploadField
                  files={files}
                  onFilesChange={setFiles}
                  label="佐證資料 (選填)"
                  helperText="可上傳多個檔案作為請假證明"
                  disabled={loading}
                />
              </Grid>
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
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? '建立中...' : '建立申請'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Warning Dialog for insufficient leave balance */}
      <Dialog
        open={warningDialogOpen}
        onClose={() => setWarningDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" color="warning.main">
            請假時數不足警告
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>剩餘時數不足</AlertTitle>
            {warningMessage.split('\n').map((line, index) => (
              <Typography key={index} variant="body2">
                {line}
              </Typography>
            ))}
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            確定要繼續送出申請嗎？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarningDialogOpen(false)}>
            取消
          </Button>
          <Button
            onClick={handleWarningConfirm}
            variant="contained"
            color="warning"
            disabled={loading}
          >
            仍要送出
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default LeaveRequestModal;