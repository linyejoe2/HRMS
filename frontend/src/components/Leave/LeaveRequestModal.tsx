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
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
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

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const { files, setFiles, clearFiles } = useFileUpload();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<LeaveRequestForm>({
    defaultValues: {
      leaveType: '',
      reason: '',
      leaveStart: '',
      leaveEnd: ''
    }
  });

  const onSubmit = async (data: LeaveRequestForm) => {
    try {
      setLoading(true);
      const submitData: LeaveRequestForm = {
        ...data,
        supportingInfo: files.length > 0 ? files : undefined
      };
      await createLeaveRequest(submitData);
      toast.success('請假申請已成功送出');
      reset();
      clearFiles();
      onClose();
    } catch (error: any) {
      console.error('Error creating leave request:', error);
      const message = error.response?.data?.message || '建立請假申請失敗';
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
            建立請假申請
          </Typography>
        </DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
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
                  rules={{ required: '請填寫請假原因' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="請假原因"
                      multiline
                      rows={3}
                      fullWidth
                      error={!!errors.reason}
                      helperText={errors.reason?.message}
                      required
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="leaveStart"
                  control={control}
                  rules={{ required: '請選擇請假開始時間' }}
                  render={({ field: { onChange, value } }) => (
                    <DateTimePicker
                      label="請假開始時間"
                      value={value ? dayjs(value) : null}
                      onChange={(newValue) => {
                        onChange(newValue?.toISOString() || '');
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.leaveStart,
                          helperText: errors.leaveStart?.message,
                          required: true
                        }
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="leaveEnd"
                  control={control}
                  rules={{ required: '請選擇請假結束時間' }}
                  render={({ field: { onChange, value } }) => (
                    <DateTimePicker
                      label="請假結束時間"
                      value={value ? dayjs(value) : null}
                      onChange={(newValue) => {
                        onChange(newValue?.toISOString() || '');
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.leaveEnd,
                          helperText: errors.leaveEnd?.message,
                          required: true
                        }
                      }}
                    />
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
    </LocalizationProvider>
  );
};

export default LeaveRequestModal;