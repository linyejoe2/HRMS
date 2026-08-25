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
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-tw';
import { useForm, Controller } from 'react-hook-form';
import { Employee, PostClockRequestForm } from '../../types';
import { postClockAPI } from '../../services/api';
import { toast } from 'react-toastify';
import FileUploadField from '../common/FileUploadField';
import EmployeeAutocomplete from '../common/EmployeeAutocomplete';
import { useFileUpload } from '../../hooks/useFileUpload';

interface PostClockRequestModalProps {
  open: boolean;
  onClose: () => void;
  hrMode?: boolean; // when true, HR/admin creates the request on behalf of a chosen employee and it's auto-approved
}

const POSTCLOCK_REASON_OPTIONS = ['忘記刷卡', '卡片遺失/損壞/未帶', '刷卡設備異常/刷卡未成功'];
const OTHER_REASON_VALUE = '其他';

const PostClockRequestModal: React.FC<PostClockRequestModalProps> = ({ open, onClose, hrMode = false }) => {
  const [loading, setLoading] = useState(false);
  const { files, setFiles, clearFiles } = useFileUpload();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [reasonChoice, setReasonChoice] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  type FormData = {
    date: string;
    time: string;
    date2: string;
    time2: string;
    clockType: 'in' | 'out' | 'in&out';
    dateObj: Dayjs | null;
    timeObj: Dayjs | null;
  };

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      date: dayjs().toISOString(),
      time: dayjs().hour(8).minute(30).second(0).toISOString(),
      date2: dayjs().toISOString(),
      time2: dayjs().hour(17).minute(30).second(0).toISOString(),
      clockType: 'in' as const,
      dateObj: null,
      timeObj: null
    }
  });

  const clockType = watch('clockType');
  const isInAndOut = clockType === 'in&out';

  const onSubmit = async (data: FormData) => {
    try {
      if (hrMode && !selectedEmployee) {
        toast.error('請選擇員工');
        return;
      }

      const finalReason = reasonChoice === OTHER_REASON_VALUE ? customReason.trim() : reasonChoice;
      if (!finalReason) {
        toast.error('請填寫補單原因');
        return;
      }

      setLoading(true);

      // Combine date and time
      const dateObj = dayjs(data.date);
      const timeObj = dayjs(data.time);
      const combinedDateTime = dateObj
        .hour(timeObj.hour())
        .minute(timeObj.minute())
        .second(0)
        .millisecond(0);

      const submitData: PostClockRequestForm = {
        date: dateObj.format('YYYY-MM-DD'),
        time: combinedDateTime.toISOString(),
        clockType: data.clockType,
        reason: finalReason,
        supportingInfo: files.length > 0 ? files : undefined
      };

      if (data.clockType === 'in&out') {
        // const date2Obj = dayjs(data.date2);
        const time2Obj = dayjs(data.time2);
        const combinedDateTime2 = dateObj
          .hour(time2Obj.hour())
          .minute(time2Obj.minute())
          .second(0)
          .millisecond(0);

        submitData.date2 = dateObj.format('YYYY-MM-DD');
        submitData.time2 = combinedDateTime2.toISOString();
      }

      const created = await postClockAPI.create(submitData, hrMode ? selectedEmployee!.empID : undefined);
      if (hrMode) {
        await postClockAPI.approve(created.data.data._id!);
      }
      toast.success(hrMode ? '補單已建立並核准' : '補單申請已成功送出');
      reset();
      clearFiles();
      setSelectedEmployee(null);
      setReasonChoice('');
      setCustomReason('');
      onClose();
    } catch (error: any) {
      console.error('Error creating postclock request:', error);
      const message = error.response?.data?.message || '建立補單申請失敗';
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
      setReasonChoice('');
      setCustomReason('');
      onClose();
    }
  };
  const timeColumnSize = isInAndOut ? 4 : 6;

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
            {hrMode ? '新增並核准補單申請' : '建立補單申請'}
          </Typography>
        </DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
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

              <Grid item xs={12} md={timeColumnSize}>
                <Controller
                  name="date"
                  control={control}
                  rules={{ required: '請選擇補單日期' }}
                  render={({ field: { onChange, value } }) => (
                    <DatePicker
                      label={'補單日期'}
                      value={dayjs(value)}
                      onChange={(newValue) => {
                        onChange(newValue?.toISOString() || '');
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.date,
                          helperText: errors.date?.message,
                          required: true
                        }
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={timeColumnSize}>
                <Controller
                  name="time"
                  control={control}
                  rules={{ required: '請選擇補單時間' }}
                  render={({ field: { onChange, value } }) => (
                    <TimePicker
                      label={isInAndOut ? '補單時間(上班)' : '補單時間'}
                      value={dayjs(value)}
                      onChange={(newValue) => {
                        onChange(newValue?.toISOString() || '');
                      }}
                      ampm={false}
                      timeSteps={{ minutes: 1 }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.time,
                          helperText: errors.time?.message,
                          required: true
                        }
                      }}
                    />
                  )}
                />
              </Grid>

              {isInAndOut && (
                <Grid item xs={12} md={timeColumnSize}>
                  <Controller
                    name="time2"
                    control={control}
                    rules={{ required: isInAndOut ? '請選擇下班時間' : false }}
                    render={({ field: { onChange, value } }) => (
                      <TimePicker
                        label="補單時間(下班)"
                        value={dayjs(value)}
                        onChange={(newValue) => {
                          onChange(newValue?.toISOString() || '');
                        }}
                        ampm={false}
                        timeSteps={{ minutes: 1 }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!errors.time2,
                            helperText: errors.time2?.message,
                            required: true
                          }
                        }}
                      />
                    )}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <Controller
                  name="clockType"
                  control={control}
                  rules={{ required: '請選擇打卡類型' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="打卡類型"
                      fullWidth
                      error={!!errors.clockType}
                      helperText={errors.clockType?.message}
                      required
                    >
                      <MenuItem value="in">上班</MenuItem>
                      <MenuItem value="out">下班</MenuItem>
                      <MenuItem value="in&out">上下班</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl component="fieldset" required>
                  <FormLabel component="legend">補單原因</FormLabel>
                  <RadioGroup
                    value={reasonChoice}
                    onChange={(e) => setReasonChoice(e.target.value)}
                  >
                    {POSTCLOCK_REASON_OPTIONS.map((option) => (
                      <FormControlLabel key={option} value={option} control={<Radio />} label={option} />
                    ))}
                    <FormControlLabel value={OTHER_REASON_VALUE} control={<Radio />} label="其他" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              {reasonChoice === OTHER_REASON_VALUE && (
                <Grid item xs={12}>
                  <TextField
                    label="請說明原因"
                    multiline
                    rows={2}
                    fullWidth
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="請說明為何需要補單..."
                    required
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <FileUploadField
                  files={files}
                  onFilesChange={setFiles}
                  label="佐證資料 (選填)"
                  helperText="可上傳多個檔案作為補單證明"
                  disabled={loading}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" component="div">
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  <li>請據實填寫，如有虛報出勤將依公司管理規章處理</li>
                  <li>補卡期限於3日內完成補單程序</li>
                  <li>每月補卡不得超過3次，特殊情況除外</li>
                  <li>逾期申請須經部門主管核准</li>
                  <li>人資核准後始得修正出勤紀錄</li>
                </Box>
              </Typography>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              onClick={handleClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              data-id='0d08fa96-9a43-4953-a1a6-13ad80023949'
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? '建立中...' : hrMode ? '建立並核准' : '建立申請'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
};

export default PostClockRequestModal;
