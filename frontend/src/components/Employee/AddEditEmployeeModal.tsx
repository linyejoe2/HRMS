import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Box
} from '@mui/material';
import { Employee, UserLevel } from '../../types';
import { employeeAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

interface AddEditEmployeeModalProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}

const AddEditEmployeeModal: React.FC<AddEditEmployeeModalProps> = ({
  open,
  employee,
  onClose,
  onSaved
}) => {
  const { user } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    empID: '',
    empID2: '',
    department: '',
    role: UserLevel.EMPLOYEE,
    isActive: true
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Department options
  const departments = [
    '資訊部',
    '人資部',
    '財務部',
    '業務部',
    '行政部',
    '研發部',
    '製造部',
    '品管部',
    '採購部',
    '法務部'
  ];

  // Role options
  const roleOptions = [
    { value: UserLevel.EMPLOYEE, label: '員工' },
    { value: UserLevel.MANAGER, label: '主管' },
    { value: UserLevel.HR, label: '人資' },
    { value: UserLevel.ADMIN, label: '管理員' }
  ];

  // Check if current user can assign this role
  const canAssignRole = (roleToAssign: UserLevel) => {
    if (user?.role === UserLevel.ADMIN) {
      return true; // Admin can assign any role
    }
    if (user?.role === UserLevel.HR) {
      // HR can assign employee, manager, but not admin or hr roles
      return roleToAssign === UserLevel.EMPLOYEE || roleToAssign === UserLevel.MANAGER;
    }
    return false;
  };

  // Initialize form data
  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        empID: employee.empID || '',
        empID2: employee.empID2 || '',
        department: employee.department || '',
        role: employee.role || UserLevel.EMPLOYEE,
        isActive: employee.isActive ?? true
      });
    } else {
      setFormData({
        name: '',
        empID: '',
        empID2: '',
        department: '',
        role: UserLevel.EMPLOYEE,
        isActive: true
      });
    }
    setErrors({});
  }, [employee, open]);

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

    if (!formData.name.trim()) {
      newErrors.name = '請輸入員工姓名';
    }

    if (!formData.empID.trim()) {
      newErrors.empID = '請輸入員工編號';
    } else if (!/^[A-Za-z0-9]+$/.test(formData.empID)) {
      newErrors.empID = '員工編號只能包含英文字母和數字';
    }

    if (!formData.empID2.trim()) {
      newErrors.empID2 = '請輸入原始編號';
    }

    if (!formData.department) {
      newErrors.department = '請選擇部門';
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
      const payload = {
        name: formData.name.trim(),
        empID: formData.empID.trim(),
        empID2: formData.empID2.trim(),
        department: formData.department,
        role: formData.role,
        isActive: formData.isActive
      };

      if (employee?._id) {
        // Update existing employee
        await employeeAPI.update(employee._id, payload);
      } else {
        // Create new employee
        await employeeAPI.create(payload);
      }

      onSaved();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 
        (employee ? '更新員工失敗' : '新增員工失敗');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!employee;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { minHeight: '500px' } }}
    >
      <DialogTitle>
        {isEditing ? '編輯員工' : '新增員工'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="員工姓名"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="員工編號"
                required
                value={formData.empID}
                onChange={(e) => handleInputChange('empID', e.target.value)}
                error={!!errors.empID}
                helperText={errors.empID || '用於系統登入的唯一識別碼'}
                disabled={loading || isEditing} // Don't allow editing empID
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="原始編號"
                required
                value={formData.empID2}
                onChange={(e) => handleInputChange('empID2', e.target.value)}
                error={!!errors.empID2}
                helperText={errors.empID2 || '原打卡系統編號'}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!errors.department}>
                <InputLabel>部門</InputLabel>
                <Select
                  value={formData.department}
                  label="部門"
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  disabled={loading}
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
                {errors.department && (
                  <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                    {errors.department}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>職位</InputLabel>
                <Select
                  value={formData.role}
                  label="職位"
                  onChange={(e) => handleInputChange('role', e.target.value as UserLevel)}
                  disabled={loading}
                >
                  {roleOptions.map((option) => (
                    <MenuItem 
                      key={option.value} 
                      value={option.value}
                      disabled={!canAssignRole(option.value)}
                    >
                      {option.label}
                      {!canAssignRole(option.value) && ' (權限不足)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ pt: 2 }}>
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
                  停用後員工將無法登入系統
                </Typography>
              </Box>
            </Grid>

            {isEditing && (
              <Grid item xs={12}>
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: 'grey.50', 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  <Typography variant="subtitle2" gutterBottom>
                    員工資訊
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    建立時間: {employee?.createdAt ? new Date(employee.createdAt).toLocaleString('zh-TW') : '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    最後更新: {employee?.updatedAt ? new Date(employee.updatedAt).toLocaleString('zh-TW') : '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    最後登入: {employee?.lastLogin ? new Date(employee.lastLogin).toLocaleString('zh-TW') : '從未登入'}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
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

export default AddEditEmployeeModal;