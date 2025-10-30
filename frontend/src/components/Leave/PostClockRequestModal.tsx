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
  Box,
  Chip
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
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';

interface PostClockRequestModalProps {
  open: boolean;
  onClose: () => void;
}

const PostClockRequestModal: React.FC<PostClockRequestModalProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<PostClockRequestForm & { dateObj: Dayjs | null, timeObj: Dayjs | null }>({
    defaultValues: {
      date: '',
      time: '',
      clockType: 'in',
      reason: '',
      supportingInfo: undefined,
      dateObj: null,
      timeObj: null
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      const fileArray = Array.from(selectedFiles);
      const validFiles = fileArray.filter(file => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf',
                           'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type)) {
          toast.error(`檔案 ${file.name} 格式不支援，只接受 jpg, png, pdf, doc, docx`);
          return false;
        }
        return true;
      });
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: PostClockRequestForm & { dateObj: Dayjs | null, timeObj: Dayjs | null }) => {
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
      toast.success('補卡申請已成功送出');
      reset();
      setFiles([]);
      onClose();
    } catch (error: any) {
      console.error('Error creating postclock request:', error);
      const message = error.response?.data?.message || '建立補卡申請失敗';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      reset();
      setFiles([]);
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
            建立補卡申請
          </Typography>
        </DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="date"
                  control={control}
                  rules={{ required: '請選擇補卡日期' }}
                  render={({ field: { onChange, value } }) => (
                    <DatePicker
                      label="補卡日期"
                      value={value ? dayjs(value) : null}
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
                  rules={{ required: '請選擇補卡時間' }}
                  render={({ field: { onChange, value } }) => (
                    <TimePicker
                      label="補卡時間"
                      value={value ? dayjs(value) : null}
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
                  rules={{ required: '請填寫補卡原因' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="補卡原因"
                      multiline
                      rows={3}
                      fullWidth
                      error={!!errors.reason}
                      helperText={errors.reason?.message}
                      placeholder="請說明為何需要補卡..."
                      required
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    佐證資料 (選填)
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AttachFileIcon />}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    上傳檔案 (jpg, png, pdf, doc, docx)
                    <input
                      type="file"
                      hidden
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                  </Button>
                  {files.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {files.map((file, index) => (
                        <Chip
                          key={index}
                          label={file.name}
                          onDelete={() => handleRemoveFile(index)}
                          deleteIcon={<DeleteIcon />}
                          sx={{ maxWidth: '100%' }}
                        />
                      ))}
                    </Box>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    可上傳多個檔案作為補卡證明
                  </Typography>
                </Box>
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
