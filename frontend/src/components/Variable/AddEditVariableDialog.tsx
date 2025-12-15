import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControlLabel,
  Switch,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Variable } from '../../types';
import { variableAPI } from '../../services/api';
import { toast } from 'react-toastify';

const sectionMap = {
  bloodType: "血型",
  education: "學歷",
  gender: "性別",
  jobLevel: "職等",
  jobType: "職稱",
  maritalStatus: "婚姻",
  shift: "班別",
  department: "部門"
};

interface AddEditVariableDialogProps {
  open: boolean;
  variable: Variable | null;
  onClose: () => void;
  onSaved: () => void;
}

const AddEditVariableDialog: React.FC<AddEditVariableDialogProps> = ({
  open,
  variable,
  onClose,
  onSaved
}) => {
  const [formData, setFormData] = useState({
    section: '',
    code: '',
    code2: '',
    description: '',
    memo: '',
    isActive: true
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data
  useEffect(() => {
    if (variable) {
      setFormData({
        section: variable.section || '',
        code: variable.code || '',
        code2: variable.code2 || '',
        description: variable.description || '',
        memo: variable.memo || '',
        isActive: variable.isActive ?? true
      });
    } else {
      setFormData({
        section: '',
        code: '',
        code2: '',
        description: '',
        memo: '',
        isActive: true
      });
    }
    setErrors({});
  }, [variable, open]);

  // Handle input change
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.section.trim()) {
      newErrors.section = '請輸入分類名稱';
    }

    if (!formData.code.trim()) {
      newErrors.code = '請輸入代碼';
    }

    if (!formData.description.trim()) {
      newErrors.description = '請輸入說明';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        section: formData.section.trim(),
        code: formData.code.trim(),
        description: formData.description.trim(),
        isActive: formData.isActive
      };

      if (formData.code2) {
        payload.code2 = formData.code2.trim();
      }

      if (formData.memo) {
        payload.memo = formData.memo.trim();
      }

      if (variable?._id) {
        // Update existing variable
        await variableAPI.update(variable._id, payload);
        toast.success('變數已更新');
      } else {
        // Create new variable
        await variableAPI.create(payload);
        toast.success('變數已建立');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error ||
        (variable ? '更新變數失敗' : '新增變數失敗');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!variable;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6">
          {isEditing ? '編輯變數' : '新增變數'}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <FormControl
              fullWidth
              required
              error={!!errors.section}
              disabled={loading || isEditing}
            >
              <InputLabel>分類名稱</InputLabel>
              <Select
                value={formData.section}
                label="分類名稱"
                onChange={(e) => handleInputChange('section', e.target.value)}
              >
                {Object.entries(sectionMap).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label} ({key})
                  </MenuItem>
                ))}
              </Select>
              {errors.section && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {errors.section}
                </Typography>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="代碼"
              required
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              error={!!errors.code}
              helperText={errors.code || '例如：01, 02'}
              disabled={loading || isEditing} // Don't allow editing code
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="次要代碼"
              value={formData.code2}
              onChange={(e) => handleInputChange('code2', e.target.value)}
              disabled={loading}
              helperText="選填"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="說明"
              required
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description || '例如：董事長、經理'}
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="備註"
              value={formData.memo}
              onChange={(e) => handleInputChange('memo', e.target.value)}
              disabled={loading}
              multiline
              rows={3}
              helperText="選填"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  disabled={loading}
                />
              }
              label="啟用狀態"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              停用後將不會在選單中顯示
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? '儲存中...' : isEditing ? '更新' : '新增'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditVariableDialog;
