import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Autocomplete,
  Chip,
  Grid
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';
import { Employee, OfficialBusinessRequestForm } from '../../types';
import { employeeAPI, officialBusinessAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import FileUploadField from '../common/FileUploadField';
import { useFileUpload } from '../../hooks/useFileUpload';

interface OfficialBusinessRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hrMode?: boolean; // when true, HR/admin creates the request on behalf of chosen employee(s) and it's auto-approved
}

const OfficialBusinessRequestModal: React.FC<OfficialBusinessRequestModalProps> = ({
  open,
  onClose,
  onSuccess,
  hrMode = false
}) => {
  const { user } = useAuth();
  const { files, addFiles, clearFiles } = useFileUpload();

  // Form state
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [licensePlate, setLicensePlate] = useState('');
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [purpose, setPurpose] = useState('');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const response = await employeeAPI.getAll(1, 1000); // Get all active employees
        const employeeList = response.data.data.employees || [];
        setEmployees(employeeList);

        // Pre-select current user if the modal is opened (not in HR mode, where HR must explicitly choose)
        if (open && user && !hrMode) {
          const currentEmployee = employeeList.find((emp: Employee) => emp.empID === user.empID);
          if (currentEmployee) {
            setSelectedEmployees([currentEmployee]);
          }
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast.error('無法載入員工列表');
      } finally {
        setLoadingEmployees(false);
      }
    };

    if (open) {
      fetchEmployees();
    }
  }, [open, user, hrMode]);

  // Reset form when modal closes or set defaults when it opens
  useEffect(() => {
    if (!open) {
      setSelectedEmployees([]);
      setLicensePlate('');
      setStartTime(null);
      setEndTime(null);
      setPurpose('');
      clearFiles();
    } else {
      // Set default times when modal opens
      const now = dayjs();
      setStartTime(now.hour(8).minute(30).second(0));
      // hrMode auto-approves immediately, so default the return time too;
      // in the normal flow leave it blank so the applicant can fill it in later.
      setEndTime(hrMode ? now.hour(17).minute(30).second(0) : null);
    }
  }, [open, clearFiles, hrMode]);

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (selectedEmployees.length === 0) {
      toast.error('請至少選擇一位參與人員');
      return;
    }

    // if (!licensePlate.trim()) {
    //   toast.error('請輸入車牌號碼');
    //   return;
    // }

    if (!startTime) {
      toast.error('請選擇外出時間');
      return;
    }

    // hrMode auto-approves on creation, so the return time must be known up front.
    // In the normal flow the applicant may leave it blank and fill it in later.
    if (hrMode && !endTime) {
      toast.error('請選擇返回時間');
      return;
    }

    // Check if startTime is at or after 08:30
    const startTimeMinutes = startTime.hour() * 60 + startTime.minute();
    const minTimeMinutes = 8 * 60 + 30; // 08:30
    if (startTimeMinutes < minTimeMinutes) {
      toast.error('外出時間必須在 08:30 之後');
      return;
    }

    if (endTime) {
      // Check if start and end times are on the same day
      if (!startTime.isSame(endTime, 'day')) {
        toast.error('外出時間與返回時間必須在同一天');
        return;
      }

      // Check if endTime is at or before 17:30
      const endTimeMinutes = endTime.hour() * 60 + endTime.minute();
      const maxTimeMinutes = 17 * 60 + 30; // 17:30
      if (endTimeMinutes > maxTimeMinutes) {
        toast.error('返回時間必須在 17:30 之前');
        return;
      }

      if (endTime.isBefore(startTime) || endTime.isSame(startTime)) {
        toast.error('返回時間必須晚於外出時間');
        return;
      }
    }

    if (!purpose.trim()) {
      toast.error('請輸入外出事由');
      return;
    }

    setLoading(true);

    try {
      const requestData: OfficialBusinessRequestForm = {
        empIDs: selectedEmployees.map(emp => emp.empID),
        licensePlate: licensePlate.trim(),
        startTime: startTime.toISOString(),
        endTime: endTime ? endTime.toISOString() : undefined,
        purpose: purpose.trim(),
        supportingInfo: files
      };

      const created = await officialBusinessAPI.create(requestData);
      if (hrMode) {
        await officialBusinessAPI.approve(created.data.data._id!);
      }

      toast.success(hrMode ? '外出申請已建立並核准' : '外出申請已成功建立');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating official business request:', error);
      toast.error(error.response?.data?.message || '建立外出申請失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{hrMode ? '新增並核准外出申請' : '建立外出申請'}</DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {/* Employee Multi-Select */}
          <Autocomplete
            multiple
            options={employees}
            getOptionLabel={(option) => `${option.name} (${option.empID})`}
            value={selectedEmployees}
            onChange={(_, newValue) => setSelectedEmployees(newValue)}
            loading={loadingEmployees}
            renderInput={(params) => (
              <TextField
                {...params}
                label="參與人員"
                required
                helperText={hrMode ? '請選擇參與本次外出的員工（可多選），第一位將列為申請人' : '請選擇參與本次外出的員工（可多選）'}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={`${option.name} (${option.empID})`}
                  {...getTagProps({ index })}
                  key={option._id}
                />
              ))
            }
            filterOptions={(options, params) => {
              const filtered = options.filter((option) => {
                const searchStr = params.inputValue.toLowerCase();
                return (
                  option.name.toLowerCase().includes(searchStr) ||
                  option.empID.toLowerCase().includes(searchStr) ||
                  (option.department && option.department.toLowerCase().includes(searchStr))
                );
              });
              return filtered;
            }}
            isOptionEqualToValue={(option, value) => option._id === value._id}
          />

          {/* License Plate */}
          <TextField
            label="車牌號碼"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
            // required
            fullWidth
            placeholder="請輸入車牌號碼"
          />

          {/* Date/Time Pickers */}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="外出時間"
                  value={startTime}
                  onChange={(newValue) => {
                    setStartTime(newValue);
                    // Reset end time if it's on a different day or violates rules
                    if (newValue && endTime) {
                      if (!newValue.isSame(endTime, 'day')) {
                        setEndTime(null);
                      }
                    }
                  }}
                  format="YYYY/MM/DD HH:mm"
                  timeSteps={{ minutes: 1 }}
                  ampm={false}
                  minTime={dayjs().hour(8).minute(29)}
                  maxTime={dayjs().hour(17).minute(30)}
                  shouldDisableTime={(value, view) => {
                    if (view === 'hours') {
                      const hour = value.hour();
                      return hour < 8 || hour > 17;
                    }
                    if (view === 'minutes') {
                      const hour = value.hour();
                      const minute = value.minute();
                      if (hour === 8 && minute < 29) return true;
                      if (hour === 17 && minute > 30) return true;
                      return false;
                    }
                    return false;
                  }}
                  slotProps={{
                    textField: {
                      required: true,
                      fullWidth: true,
                      helperText: '時間必須在 08:30 ~ 17:30 之間'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="返回時間"
                  value={endTime}
                  onChange={(newValue) => setEndTime(newValue)}
                  format="YYYY/MM/DD HH:mm"
                  timeSteps={{ minutes: 1 }}
                  ampm={false}
                  minDateTime={startTime || undefined}
                  // maxTime={dayjs().hour(17).minute(30)}
                  shouldDisableDate={(date) => {
                    // Only allow the same day as startTime
                    if (startTime) {
                      return !date.isSame(startTime, 'day');
                    }
                    return false;
                  }}
                  shouldDisableTime={(value, view) => {
                    if (view === 'hours') {
                      const hour = value.hour();
                      return hour > 17;
                    }
                    if (view === 'minutes') {
                      const hour = value.hour();
                      const minute = value.minute();
                      if (hour === 17 && minute > 30) return true;
                      return false;
                    }
                    return false;
                  }}
                  disabled={!startTime}
                  slotProps={{
                    textField: {
                      required: hrMode,
                      fullWidth: true,
                      helperText: !startTime
                        ? '請先選擇外出時間'
                        : hrMode
                          ? '必須與外出時間同一天且在 17:30 之前'
                          : '若尚未確定可先留空，之後再回來填寫'
                    }
                  }}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>

          {/* Purpose */}
          <TextField
            label="外出事由"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
            fullWidth
            multiline
            rows={4}
            placeholder="請說明外出的目的與事由"
          />

          {/* File Upload */}
          <Box>
            <FileUploadField
              files={files}
              onFilesChange={addFiles}
              disabled={loading}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || loadingEmployees}
        >
          {loading ? '送出中...' : hrMode ? '建立並核准' : '送出申請'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OfficialBusinessRequestModal;
