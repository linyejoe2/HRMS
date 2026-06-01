import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  CircularProgress,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { toast } from 'react-toastify';
import { legacyLeaveAPI } from '../../services/api';
import { Employee } from '../../types';

const LEAVE_TYPES = ['特休', '事假', '病假', '喪假', '產假', '婚假', '公假', '出差', '公傷'];

interface Props {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
}

const LegacyLeaveDialog: React.FC<Props> = ({ open, employee, onClose }) => {
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(LEAVE_TYPES.map(t => [t, 0]))
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const monthKey = selectedMonth.format('YYYY-MM');

  const loadData = useCallback(async () => {
    if (!employee) return;
    setLoading(true);
    try {
      const res = await legacyLeaveAPI.getByEmpID(employee.empID);
      const records: any[] = res.data.data ?? [];
      const record = records.find((r: any) => r.month === monthKey);
      const next = Object.fromEntries(LEAVE_TYPES.map(t => [t, 0]));
      if (record) {
        for (const entry of record.leaves) {
          if (entry.type in next) next[entry.type] = entry.count;
        }
      }
      setValues(next);
    } catch {
      toast.error('載入失敗');
    } finally {
      setLoading(false);
    }
  }, [employee, monthKey]);

  useEffect(() => {
    if (open && employee) loadData();
  }, [open, employee, loadData]);

  const handleChange = (type: string, raw: string) => {
    const parsed = parseInt(raw, 10);
    setValues(prev => ({ ...prev, [type]: isNaN(parsed) ? 0 : Math.max(0, parsed) }));
  };

  const handleStep = (type: string, delta: number) => {
    setValues(prev => ({ ...prev, [type]: Math.max(0, (prev[type] ?? 0) + delta) }));
  };

  const handleSave = async () => {
    if (!employee) return;
    setSaving(true);
    try {
      const leaves = LEAVE_TYPES.map(type => ({ type, count: values[type] ?? 0 }));
      await legacyLeaveAPI.upsert(employee.empID, monthKey, leaves);
      toast.success('儲存成功');
      onClose();
    } catch {
      toast.error('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        舊系統休假時數
        {employee && (
          <Typography variant="body2" color="text.secondary">
            {employee.name} ({employee.empID})
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            views={['year', 'month']}
            // label="月份"
            value={selectedMonth}
            onChange={(v) => v && setSelectedMonth(v)}
            format="YYYY/MM"
            slotProps={{ textField: { fullWidth: true, size: 'small', sx: { mb: 2 } } }}
          />
        </LocalizationProvider>

        <Divider sx={{ mb: 1 }} />

        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          LEAVE_TYPES.map(type => (
            <Box
              key={type}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75 }}
            >
              <Typography sx={{ flex: 1, minWidth: 40 }}>{type}</Typography>
              <IconButton size="small" onClick={() => handleStep(type, -1)}>
                <RemoveIcon fontSize="small" />
              </IconButton>
              <TextField
                size="small"
                value={values[type] ?? 0}
                onChange={(e) => handleChange(type, e.target.value)}
                inputProps={{ style: { textAlign: 'center', width: 56 } }}
                sx={{ width: 72 }}
              />
              <IconButton size="small" onClick={() => handleStep(type, 1)}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>
          ))
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>取消</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
          {saving ? <CircularProgress size={18} /> : '儲存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LegacyLeaveDialog;
