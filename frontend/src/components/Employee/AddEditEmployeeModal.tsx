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
  Box,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { Employee, UserLevel, LeaveRequest } from '../../types';
import { employeeAPI, authAPI, queryLeaveRequests } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import {
  calculateRemainingPersonalLeaveMinutes,
  calculateRemainingSickLeaveMinutes,
  calculateRemainingSpecialLeaveMinutes,
  calculateSpecialLeaveEntitlementDays,
  calculateUsedMinutes,
  formatMinutesToHours,
  getLeaveColorByHours,
  minutesToHours,
  RemainingLeaveData
} from '../../utils/leaveCalculations';
import LeaveDetailsDialog from './EditEmployeeLeaveDialog';

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
    cardID: '',
    department: '',
    role: UserLevel.EMPLOYEE,
    isActive: true,
    hireDate: '',
    salary: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [verificationPassword, setVerificationPassword] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [sensitiveData, setSensitiveData] = useState<Employee | null>(null);

  // Leave information state
  const [leaveInfo, setLeaveInfo] = useState<{
    personalLeave: RemainingLeaveData | null;
    sickLeave: RemainingLeaveData | null;
    specialLeave: RemainingLeaveData | null;
    loading: boolean;
  }>({
    personalLeave: null,
    sickLeave: null,
    specialLeave: null,
    loading: false
  });

  // Leave details dialog state
  const [leaveDetailsDialog, setLeaveDetailsDialog] = useState<{
    open: boolean;
    leaveData: RemainingLeaveData;
  }>({
    open: false,
    leaveData: {
      type: "",
      displayName: "",
      totalHours: 0,
      usedHours: 0,
      remainingHours: 0,
      leaves: []
    }
  });

  // Department options
  // 管理部、業務部、研發課、財務部、稽核室、總經理室
  const departments = [
    '管理部',
    '研發課',
    '財務部',
    '業務部',
    '稽核室',
    '總經理室',
    // '製造部',
    // '品管部',
    // '採購部',
    // '法務部'
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

  // Password verification functions
  const handleToggleSensitive = () => {
    if (showSensitive) {
      setShowSensitive(false);
      setSensitiveData(null);
    } else {
      setPasswordDialogOpen(true);
    }
  };

  const handlePasswordVerification = async () => {
    if (!verificationPassword.trim()) {
      toast.error('請輸入密碼');
      return;
    }

    try {
      setVerifyingPassword(true);
      const response = await authAPI.getMeWithSensitive(verificationPassword, employee?._id);
      const sensitiveEmployee = response.data.data.user;
      setSensitiveData(sensitiveEmployee);

      // Update form data with sensitive information
      setFormData(prev => ({
        ...prev,
        hireDate: sensitiveEmployee.hireDate ? sensitiveEmployee.hireDate.split('T')[0] : '',
        salary: sensitiveEmployee.salary ? sensitiveEmployee.salary.toString() : ''
      }));

      setShowSensitive(true);
      setPasswordDialogOpen(false);
      setVerificationPassword('');
      toast.success('敏感資訊已顯示');
    } catch (error: any) {
      toast.error(error.response?.data?.error || '密碼驗證失敗');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleClosePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setVerificationPassword('');
    setVerifyingPassword(false);
  };

  // Fetch remaining leave information
  const fetchLeaveInfo = async (empId: string, hireDate?: string) => {
    setLeaveInfo(prev => ({ ...prev, loading: true }));

    try {
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      // Fetch all leave types
      const [personalResponse, sickResponse, specialResponse] = await Promise.all([
        queryLeaveRequests({
          timeStart: oneYearAgo.toISOString(),
          timeEnd: now.toISOString(),
          leaveType: '事假',
          status: 'approved'
        }),
        queryLeaveRequests({
          timeStart: oneYearAgo.toISOString(),
          timeEnd: now.toISOString(),
          leaveType: '普通傷病假',
          status: 'approved'
        }),
        queryLeaveRequests({
          timeStart: oneYearAgo.toISOString(),
          timeEnd: now.toISOString(),
          leaveType: '特別休假',
          status: 'approved'
        })
      ]);

      // Filter leaves by employee ID
      const personalLeaves = personalResponse.data.data.filter((l: LeaveRequest) => l.empID === empId);
      const sickLeaves = sickResponse.data.data.filter((l: LeaveRequest) => l.empID === empId);
      const specialLeaves = specialResponse.data.data.filter((l: LeaveRequest) => l.empID === empId);

      const personalRemainingHours = formatMinutesToHours(calculateRemainingPersonalLeaveMinutes(personalLeaves));
      const personalUsedMinutes = calculateUsedMinutes(personalLeaves);
      const personalUsedHours = minutesToHours(personalUsedMinutes);
      const personalTotalHours = 14 * 8; // 14 days * 8 hours = 112 hours

      // Calculate sick leave using utility function
      const sickRemainingHours = formatMinutesToHours(calculateRemainingSickLeaveMinutes(sickLeaves));
      const sickUsedMinutes = calculateUsedMinutes(sickLeaves);
      const sickUsedHours = minutesToHours(sickUsedMinutes);
      const sickTotalHours = 30 * 8; // 30 days * 8 hours = 240 hours


      // Calculate special leave using utility function
      const hireDateObj = hireDate ? new Date(hireDate) : undefined;
      const specialRemainingHours = formatMinutesToHours(calculateRemainingSpecialLeaveMinutes(specialLeaves, hireDateObj));
      const specialUsedMinutes = calculateUsedMinutes(specialLeaves);
      const specialUsedHours = minutesToHours(specialUsedMinutes);
      const specialTotalDays = hireDateObj ? calculateSpecialLeaveEntitlementDays(hireDateObj) : 0;
      const specialTotalHours = specialTotalDays * 8;

      setLeaveInfo({
        personalLeave: {
          type: '事假',
          displayName: '事假',
          totalHours: personalTotalHours,
          usedHours: personalUsedHours,
          remainingHours: personalRemainingHours,
          leaves: personalLeaves
        },
        sickLeave: {
          type: '普通傷病假',
          displayName: '病假',
          totalHours: sickTotalHours,
          usedHours: sickUsedHours,
          remainingHours: sickRemainingHours,
          leaves: sickLeaves
        },
        specialLeave: {
          type: '特別休假',
          displayName: '特休',
          totalHours: specialTotalHours,
          usedHours: specialUsedHours,
          remainingHours: specialRemainingHours,
          leaves: specialLeaves
        },
        loading: false
      });
    } catch (error) {
      console.error('Error fetching leave info:', error);
    }
  };

  // Initialize form data
  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        empID: employee.empID || '',
        cardID: employee.cardID || '',
        department: employee.department || '',
        role: employee.role || UserLevel.EMPLOYEE,
        isActive: employee.isActive ?? true,
        hireDate: employee.hireDate ? employee.hireDate.split('T')[0] : '',
        salary: employee.salary ? employee.salary.toString() : ''
      });

      // Fetch leave information for this employee
      if (employee.empID) {
        fetchLeaveInfo(employee.empID, employee.hireDate);
      }
    } else {
      setFormData({
        name: '',
        empID: '',
        cardID: '',
        department: '',
        role: UserLevel.EMPLOYEE,
        isActive: true,
        hireDate: '',
        salary: ''
      });
    }
    setErrors({});
    setShowSensitive(false);
    setSensitiveData(null);
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

    if (!formData.cardID.trim()) {
      newErrors.cardID = '請輸入門禁卡號';
    }

    // if (!formData.department) {
    //   newErrors.department = '請選擇部門';
    // }

    // Validate salary if provided
    if (formData.salary && isNaN(Number(formData.salary))) {
      newErrors.salary = '薪水必須是有效的數字';
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
        name: formData.name.trim(),
        empID: formData.empID.trim(),
        cardID: formData.cardID.trim(),
        department: formData.department,
        role: formData.role,
        isActive: formData.isActive
      };

      // Add sensitive fields if provided
      if (formData.hireDate) {
        payload.hireDate = formData.hireDate;
      }
      if (formData.salary) {
        payload.salary = Number(formData.salary);
      }

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

  // Handle leave chip click
  const handleLeaveChipClick = (leaveData: RemainingLeaveData | null) => {
    if (leaveData == null) {
      toast.error("找不到休假資料!")
      return
    }
    setLeaveDetailsDialog({
      open: true,
      leaveData
    });
  };

  // Handle leave details dialog close
  const handleLeaveDetailsClose = () => {
    setLeaveDetailsDialog({
      open: false,
      leaveData: {
        type: "",
        displayName: "",
        totalHours: 0,
        usedHours: 0,
        remainingHours: 0,
        leaves: []
      }
    });
    // Refresh leave info after closing the dialog
    if (employee?.empID) {
      fetchLeaveInfo(employee.empID, employee.hireDate);
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {isEditing ? '編輯員工' : '新增員工'}
          </Typography>
          {isEditing && (
            <Button
              variant={showSensitive ? "contained" : "outlined"}
              size="small"
              startIcon={showSensitive ? <VisibilityIcon /> : <LockIcon />}
              onClick={handleToggleSensitive}
              color={showSensitive ? "secondary" : "primary"}
            >
              {showSensitive ? '隱藏敏感資訊' : '顯示敏感資訊'}
            </Button>
          )}
        </Box>
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
                label="門禁卡號"
                required
                value={formData.cardID}
                onChange={(e) => handleInputChange('cardID', e.target.value)}
                error={!!errors.cardID}
                helperText={errors.cardID || '換卡時更改'}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.department}>
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

            {/* Sensitive Information Section */}
            {showSensitive && sensitiveData && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Chip
                      label="敏感資訊"
                      color="secondary"
                      size="small"
                      icon={<LockIcon />}
                    />
                  </Divider>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="入職日期"
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => handleInputChange('hireDate', e.target.value)}
                    disabled={loading}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  // sx={{
                  //   '& .MuiOutlinedInput-root': {
                  //     '& fieldset': {
                  //       borderColor: '#1976d2',
                  //     },
                  //   },
                  //   '& .MuiInputBase-input': {
                  //     color: '#1976d2',
                  //     fontWeight: 'bold',
                  //   },
                  // }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="薪水"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => handleInputChange('salary', e.target.value)}
                    error={!!errors.salary}
                    helperText={errors.salary || 'NT$ 月薪'}
                    disabled={loading}
                    inputProps={{
                      min: 0,
                      step: 1000
                    }}
                  // sx={{
                  //   '& .MuiOutlinedInput-root': {
                  //     '& fieldset': {
                  //       borderColor: '#1976d2',
                  //     },
                  //   },
                  //   '& .MuiInputBase-input': {
                  //     color: '#1976d2',
                  //     fontWeight: 'bold',
                  //   },
                  // }}
                  />
                </Grid>
              </>
            )}

            {isEditing && (
              <>
                {/* Remaining Leave Information */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Chip
                      label="剩餘假別"
                      color="primary"
                      size="small"
                    />
                  </Divider>
                </Grid>

                <Grid item xs={12}>
                  {leaveInfo.loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
                      <CircularProgress size={24} sx={{ mr: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        載入假別資訊中...
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{
                      p: 2,
                      backgroundColor: 'grey.50',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}>
                      <Typography variant="subtitle2" gutterBottom>
                        剩餘假別統計（過去一年）
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                        <Chip
                          label={`事假：${leaveInfo.personalLeave?.remainingHours || 0} 小時`}
                          color={getLeaveColorByHours(leaveInfo.personalLeave?.remainingHours || 0)}
                          sx={{ fontWeight: 'medium', cursor: 'pointer' }}
                          onClick={() => handleLeaveChipClick(leaveInfo.personalLeave)}
                        />
                        <Chip
                          label={`病假：${leaveInfo.sickLeave?.remainingHours || 0} 小時`}
                          color={getLeaveColorByHours(leaveInfo.sickLeave?.remainingHours || 0)}
                          sx={{ fontWeight: 'medium', cursor: 'pointer' }}
                          onClick={() => handleLeaveChipClick(leaveInfo.sickLeave)}
                        />
                        <Chip
                          label={`特休：${leaveInfo.specialLeave?.remainingHours || 0} 小時`}
                          color={getLeaveColorByHours(leaveInfo.specialLeave?.remainingHours || 0)}
                          sx={{ fontWeight: 'medium', cursor: 'pointer' }}
                          onClick={() => handleLeaveChipClick(leaveInfo.specialLeave)}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        *點擊查看詳細記錄，剩餘時數基於過去一年的已核准請假記錄計算
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* Employee Information */}
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
              </>
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

      {/* Password Verification Dialog */}
      <Dialog open={passwordDialogOpen} onClose={handleClosePasswordDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <LockIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">請輸入系統密碼</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            為了保護敏感資訊，請輸入您的系統密碼以驗證身份。
          </Typography>
          <TextField
            label="系統密碼"
            type="password"
            fullWidth
            value={verificationPassword}
            onChange={(e) => setVerificationPassword(e.target.value)}
            variant="outlined"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePasswordVerification();
              }
            }}
            disabled={verifyingPassword}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog} disabled={verifyingPassword}>
            取消
          </Button>
          <Button
            onClick={handlePasswordVerification}
            variant="contained"
            disabled={verifyingPassword || !verificationPassword.trim()}
            startIcon={verifyingPassword ? undefined : <LockIcon />}
          >
            {verifyingPassword ? '驗證中...' : '驗證密碼'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Leave Details Dialog */}
      {employee && leaveDetailsDialog.open && (
        <LeaveDetailsDialog
          open={leaveDetailsDialog.open}
          onClose={handleLeaveDetailsClose}
          empID={employee.empID}
          employeeName={employee.name}
          leaveData={leaveDetailsDialog.leaveData}
        />
      )}
    </Dialog>
  );
};

export default AddEditEmployeeModal;