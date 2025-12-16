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
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-tw';
import { useForm, Controller } from 'react-hook-form';
import { PostClockRequestForm } from '../../types';
import { createPostClockRequest } from '../../services/api';
import { toast } from 'react-toastify';
import FileUploadField from '../common/FileUploadField';
import { useFileUpload } from '../../hooks/useFileUpload';

interface PostClockRequestModalProps {
  open: boolean;
  onClose: () => void;
}

const PostClockRequestModal: React.FC<PostClockRequestModalProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const { files, setFiles, clearFiles } = useFileUpload();

  type FormData = {
    date: string;
    time: string;
    clockType: 'in' | 'out';
    reason: string;
    dateObj: Dayjs | null;
    timeObj: Dayjs | null;
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      date: dayjs().toISOString(),
      time: dayjs().hour(8).minute(30).second(0).toISOString(),
      clockType: 'in' as const,
      reason: '',
      dateObj: null,
      timeObj: null
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
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
        reason: data.reason,
        supportingInfo: files.length > 0 ? files : undefined
      };

      await createPostClockRequest(submitData);
      toast.success('補單申請已成功送出');
      reset();
      clearFiles();
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
            建立補單申請
          </Typography>
        </DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="date"
                  control={control}
                  rules={{ required: '請選擇補單日期' }}
                  render={({ field: { onChange, value } }) => (
                    <DatePicker
                      label="補單日期"
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

              <Grid item xs={12} md={6}>
                <Controller
                  name="time"
                  control={control}
                  rules={{ required: '請選擇補單時間' }}
                  render={({ field: { onChange, value } }) => (
                    <TimePicker
                      label="補單時間"
                      value={dayjs(value)}
                      onChange={(newValue) => {
                        onChange(newValue?.toISOString() || '');
                      }}
                      ampm={false}
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
                    </TextField>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="reason"
                  control={control}
                  rules={{ required: '請填寫補單原因' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="補單原因"
                      multiline
                      rows={3}
                      fullWidth
                      error={!!errors.reason}
                      helperText={errors.reason?.message}
                      placeholder="請說明為何需要補單..."
                      required
                    />
                  )}
                />
              </Grid>

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
    </LocalizationProvider>
  );
};

export default PostClockRequestModal;
