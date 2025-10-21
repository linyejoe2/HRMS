import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  CircularProgress
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-tw';
import { useForm, Controller } from 'react-hook-form';
import { BusinessTripRequestForm } from '../../types';
import { createBusinessTripRequest } from '../../services/api';
import { toast } from 'react-toastify';

interface BusinessTripRequestModalProps {
  open: boolean;
  onClose: () => void;
}

const BusinessTripRequestModal: React.FC<BusinessTripRequestModalProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<BusinessTripRequestForm & { tripStartObj: Dayjs | null, tripEndObj: Dayjs | null }>({
    defaultValues: {
      destination: '',
      purpose: '',
      tripStart: '',
      tripEnd: '',
      transportation: '',
      estimatedCost: undefined,
      notes: '',
      tripStartObj: null,
      tripEndObj: null
    }
  });

  const tripStart = watch('tripStart');

  const onSubmit = async (data: BusinessTripRequestForm & { tripStartObj: Dayjs | null, tripEndObj: Dayjs | null }) => {
    try {
      setLoading(true);

      // Validate dates
      const startDate = dayjs(data.tripStart);
      const endDate = dayjs(data.tripEnd);

      if (endDate.isBefore(startDate)) {
        toast.error('返回時間不能早於出發時間');
        setLoading(false);
        return;
      }

      const submitData: BusinessTripRequestForm = {
        destination: data.destination,
        purpose: data.purpose,
        tripStart: startDate.toISOString(),
        tripEnd: endDate.toISOString(),
        transportation: data.transportation,
        estimatedCost: data.estimatedCost,
        notes: data.notes
      };

      await createBusinessTripRequest(submitData);
      toast.success('出差申請已成功送出');
      reset();
      onClose();
    } catch (error: any) {
      console.error('Error creating business trip request:', error);
      const message = error.response?.data?.message || '建立出差申請失敗';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      reset();
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
            建立出差申請
          </Typography>
        </DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="destination"
                  control={control}
                  rules={{ required: '請填寫出差目的地' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="出差目的地"
                      fullWidth
                      error={!!errors.destination}
                      helperText={errors.destination?.message}
                      placeholder="例如：台北、高雄、上海..."
                      required
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
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
                      placeholder="例如：高鐵、飛機、自駕..."
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
                      value={value ? dayjs(value) : null}
                      onChange={(newValue) => {
                        onChange(newValue?.toISOString() || '');
                      }}
                      ampm={false}
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
                      value={value ? dayjs(value) : null}
                      onChange={(newValue) => {
                        onChange(newValue?.toISOString() || '');
                      }}
                      minDateTime={tripStart ? dayjs(tripStart) : undefined}
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
                <Controller
                  name="purpose"
                  control={control}
                  rules={{ required: '請填寫出差目的' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="出差目的"
                      multiline
                      rows={3}
                      fullWidth
                      error={!!errors.purpose}
                      helperText={errors.purpose?.message}
                      placeholder="請說明出差的目的與行程..."
                      required
                    />
                  )}
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

export default BusinessTripRequestModal;
