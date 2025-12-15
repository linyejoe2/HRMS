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
import { Employee, UserLevel, Variable } from '../../types';
import { employeeAPI, authAPI, variableAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { getLeaveColorByHours } from '../../utils/leaveCalculations';
import { fetchUserLeaveData, LeaveData } from '../../services/leaveService';
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
    salary: '',
    // Extended basic information
    birthPlace: '',
    idNumber: '',
    dateOfBirth: '',
    education: '',
    bloodType: '',
    maritalStatus: '',
    gender: '',
    phone: '',
    address: '',
    bankAccount: '',
    // Job information
    shift: '',
    jobTitle: '',
    jobLevel: '',
    endDate: '',
    // Salary breakdown
    baseSalary: '',
    jobAllowance: '',
    dutyAllowance: '',
    professionalAllowance: '',
    specialAllowance: '',
    workSubsidy: '',
    // Insurance information
    laborInsuranceSalary: '',
    laborInsurancePremium: '',
    addLaborInsurancePremium: '',
    healthInsuranceSalary: '',
    healthInsurancePremium: '',
    addHealthInsurancePremium: '',
    insuredDependents: '',
    insuranceJoinDate: '',
    dependentsCount: '',
    // Retirement information
    laborRetirementSalary: '',
    selfContributionRatio: '',
    selfContributionAmount: '',
    companyContributionAmount: ''
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
    personalLeave: LeaveData | null;
    sickLeave: LeaveData | null;
    specialLeave: LeaveData | null;
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
    leaveData: LeaveData;
  }>({
    open: false,
    leaveData: {
      type: "",
      displayName: "",
      totalHours: 0,
      usedHours: 0,
      remainingHours: 0,
      leaves: [],
      adjustments: []
    }
  });

  // Variables state
  const [variables, setVariables] = useState<{
    bloodType: Variable[];
    education: Variable[];
    gender: Variable[];
    jobLevel: Variable[];
    jobType: Variable[];
    maritalStatus: Variable[];
    shift: Variable[];
    department: Variable[];
  }>({
    bloodType: [],
    education: [],
    gender: [],
    jobLevel: [],
    jobType: [],
    maritalStatus: [],
    shift: [],
    department: []
  });

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

      // Update form data with all sensitive information
      setFormData(prev => ({
        ...prev,
        hireDate: sensitiveEmployee.hireDate ? sensitiveEmployee.hireDate.split('T')[0] : '',
        salary: sensitiveEmployee.salary ? sensitiveEmployee.salary.toString() : '',
        // Salary breakdown
        baseSalary: sensitiveEmployee.baseSalary ? sensitiveEmployee.baseSalary.toString() : '',
        jobAllowance: sensitiveEmployee.jobAllowance ? sensitiveEmployee.jobAllowance.toString() : '',
        dutyAllowance: sensitiveEmployee.dutyAllowance ? sensitiveEmployee.dutyAllowance.toString() : '',
        professionalAllowance: sensitiveEmployee.professionalAllowance ? sensitiveEmployee.professionalAllowance.toString() : '',
        specialAllowance: sensitiveEmployee.specialAllowance ? sensitiveEmployee.specialAllowance.toString() : '',
        workSubsidy: sensitiveEmployee.workSubsidy ? sensitiveEmployee.workSubsidy.toString() : '',
        // Insurance information
        laborInsuranceSalary: sensitiveEmployee.laborInsuranceSalary ? sensitiveEmployee.laborInsuranceSalary.toString() : '',
        laborInsurancePremium: sensitiveEmployee.laborInsurancePremium ? sensitiveEmployee.laborInsurancePremium.toString() : '',
        addLaborInsurancePremium: sensitiveEmployee.addLaborInsurancePremium ? sensitiveEmployee.addLaborInsurancePremium.toString() : '',
        healthInsuranceSalary: sensitiveEmployee.healthInsuranceSalary ? sensitiveEmployee.healthInsuranceSalary.toString() : '',
        healthInsurancePremium: sensitiveEmployee.healthInsurancePremium ? sensitiveEmployee.healthInsurancePremium.toString() : '',
        addHealthInsurancePremium: sensitiveEmployee.addHealthInsurancePremium ? sensitiveEmployee.addHealthInsurancePremium.toString() : '',
        // Retirement information
        laborRetirementSalary: sensitiveEmployee.laborRetirementSalary ? sensitiveEmployee.laborRetirementSalary.toString() : '',
        selfContributionRatio: sensitiveEmployee.selfContributionRatio ? sensitiveEmployee.selfContributionRatio.toString() : '',
        selfContributionAmount: sensitiveEmployee.selfContributionAmount ? sensitiveEmployee.selfContributionAmount.toString() : '',
        companyContributionAmount: sensitiveEmployee.companyContributionAmount ? sensitiveEmployee.companyContributionAmount.toString() : ''
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

  // Fetch variables
  const fetchVariables = async () => {
    try {
      const response = await variableAPI.getAll(undefined, false); // Only get active variables
      const allVariables = response.data.data.variables;

      // Group variables by section
      const grouped = {
        bloodType: allVariables.filter((v: Variable) => v.section === 'bloodType'),
        education: allVariables.filter((v: Variable) => v.section === 'education'),
        gender: allVariables.filter((v: Variable) => v.section === 'gender'),
        jobLevel: allVariables.filter((v: Variable) => v.section === 'jobLevel'),
        jobType: allVariables.filter((v: Variable) => v.section === 'jobType'),
        maritalStatus: allVariables.filter((v: Variable) => v.section === 'maritalStatus'),
        shift: allVariables.filter((v: Variable) => v.section === 'shift'),
        department: allVariables.filter((v: Variable) => v.section === 'department')
      };

      setVariables(grouped);
    } catch (error) {
      console.error('Error fetching variables:', error);
      toast.error('載入選項資料失敗');
    }
  };

  // Fetch remaining leave information
  const fetchLeaveInfo = async (empId: string, hireDate?: string) => {
    if (!hireDate) {
      setLeaveInfo({
        personalLeave: null,
        sickLeave: null,
        specialLeave: null,
        loading: false
      });
      return;
    }

    setLeaveInfo(prev => ({ ...prev, loading: true }));

    try {
      const leaveData = await fetchUserLeaveData(empId, hireDate);
      setLeaveInfo({
        personalLeave: leaveData.personalLeave,
        sickLeave: leaveData.sickLeave,
        specialLeave: leaveData.specialLeave,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching leave info:', error);
      toast.error('載入假別資料失敗');
      setLeaveInfo({
        personalLeave: null,
        sickLeave: null,
        specialLeave: null,
        loading: false
      });
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
        salary: employee.salary ? employee.salary.toString() : '',
        // Extended basic information
        birthPlace: employee.birthPlace || '',
        idNumber: employee.idNumber || '',
        dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '',
        education: employee.education || '',
        bloodType: employee.bloodType || '',
        maritalStatus: employee.maritalStatus || '',
        gender: employee.gender || '',
        phone: employee.phone || '',
        address: employee.address || '',
        bankAccount: employee.bankAccount || '',
        // Job information
        shift: employee.shift || '',
        jobTitle: employee.jobTitle || '',
        jobLevel: employee.jobLevel || '',
        endDate: employee.endDate ? employee.endDate.split('T')[0] : '',
        // Salary breakdown
        baseSalary: employee.baseSalary ? employee.baseSalary.toString() : '',
        jobAllowance: employee.jobAllowance ? employee.jobAllowance.toString() : '',
        dutyAllowance: employee.dutyAllowance ? employee.dutyAllowance.toString() : '',
        professionalAllowance: employee.professionalAllowance ? employee.professionalAllowance.toString() : '',
        specialAllowance: employee.specialAllowance ? employee.specialAllowance.toString() : '',
        workSubsidy: employee.workSubsidy ? employee.workSubsidy.toString() : '',
        // Insurance information
        laborInsuranceSalary: employee.laborInsuranceSalary ? employee.laborInsuranceSalary.toString() : '',
        laborInsurancePremium: employee.laborInsurancePremium ? employee.laborInsurancePremium.toString() : '',
        addLaborInsurancePremium: employee.addLaborInsurancePremium ? employee.addLaborInsurancePremium.toString() : '',
        healthInsuranceSalary: employee.healthInsuranceSalary ? employee.healthInsuranceSalary.toString() : '',
        healthInsurancePremium: employee.healthInsurancePremium ? employee.healthInsurancePremium.toString() : '',
        addHealthInsurancePremium: employee.addHealthInsurancePremium ? employee.addHealthInsurancePremium.toString() : '',
        insuredDependents: employee.insuredDependents ? employee.insuredDependents.toString() : '',
        insuranceJoinDate: employee.insuranceJoinDate ? employee.insuranceJoinDate.split('T')[0] : '',
        dependentsCount: employee.dependentsCount ? employee.dependentsCount.toString() : '',
        // Retirement information
        laborRetirementSalary: employee.laborRetirementSalary ? employee.laborRetirementSalary.toString() : '',
        selfContributionRatio: employee.selfContributionRatio ? employee.selfContributionRatio.toString() : '',
        selfContributionAmount: employee.selfContributionAmount ? employee.selfContributionAmount.toString() : '',
        companyContributionAmount: employee.companyContributionAmount ? employee.companyContributionAmount.toString() : ''
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
        salary: '',
        // Extended basic information
        birthPlace: '',
        idNumber: '',
        dateOfBirth: '',
        education: '',
        bloodType: '',
        maritalStatus: '',
        gender: '',
        phone: '',
        address: '',
        bankAccount: '',
        // Job information
        shift: '',
        jobTitle: '',
        jobLevel: '',
        endDate: '',
        // Salary breakdown
        baseSalary: '',
        jobAllowance: '',
        dutyAllowance: '',
        professionalAllowance: '',
        specialAllowance: '',
        workSubsidy: '',
        // Insurance information
        laborInsuranceSalary: '',
        laborInsurancePremium: '',
        addLaborInsurancePremium: '',
        healthInsuranceSalary: '',
        healthInsurancePremium: '',
        addHealthInsurancePremium: '',
        insuredDependents: '',
        insuranceJoinDate: '',
        dependentsCount: '',
        // Retirement information
        laborRetirementSalary: '',
        selfContributionRatio: '',
        selfContributionAmount: '',
        companyContributionAmount: ''
      });
    }
    setErrors({});
    setShowSensitive(false);
    setSensitiveData(null);
  }, [employee, open]);

  // Fetch variables on component mount
  useEffect(() => {
    fetchVariables();
  }, []);

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

      // Add extended basic information
      if (formData.birthPlace) payload.birthPlace = formData.birthPlace.trim();
      if (formData.idNumber) payload.idNumber = formData.idNumber.trim();
      if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth;
      if (formData.education) payload.education = formData.education;
      if (formData.bloodType) payload.bloodType = formData.bloodType;
      if (formData.maritalStatus) payload.maritalStatus = formData.maritalStatus;
      if (formData.gender) payload.gender = formData.gender;
      if (formData.phone) payload.phone = formData.phone.trim();
      if (formData.address) payload.address = formData.address.trim();
      if (formData.bankAccount) payload.bankAccount = formData.bankAccount.trim();

      // Add job information
      if (formData.shift) payload.shift = formData.shift;
      if (formData.jobTitle) payload.jobTitle = formData.jobTitle;
      if (formData.jobLevel) payload.jobLevel = formData.jobLevel;
      if (formData.endDate) payload.endDate = formData.endDate;

      // Add sensitive fields if provided
      if (formData.hireDate) payload.hireDate = formData.hireDate;
      if (formData.salary) payload.salary = Number(formData.salary);

      // Add salary breakdown
      if (formData.baseSalary) payload.baseSalary = Number(formData.baseSalary);
      if (formData.jobAllowance) payload.jobAllowance = Number(formData.jobAllowance);
      if (formData.dutyAllowance) payload.dutyAllowance = Number(formData.dutyAllowance);
      if (formData.professionalAllowance) payload.professionalAllowance = Number(formData.professionalAllowance);
      if (formData.specialAllowance) payload.specialAllowance = Number(formData.specialAllowance);
      if (formData.workSubsidy) payload.workSubsidy = Number(formData.workSubsidy);

      // Add insurance information
      if (formData.laborInsuranceSalary) payload.laborInsuranceSalary = Number(formData.laborInsuranceSalary);
      if (formData.laborInsurancePremium) payload.laborInsurancePremium = Number(formData.laborInsurancePremium);
      if (formData.addLaborInsurancePremium) payload.addLaborInsurancePremium = Number(formData.addLaborInsurancePremium);
      if (formData.healthInsuranceSalary) payload.healthInsuranceSalary = Number(formData.healthInsuranceSalary);
      if (formData.healthInsurancePremium) payload.healthInsurancePremium = Number(formData.healthInsurancePremium);
      if (formData.addHealthInsurancePremium) payload.addHealthInsurancePremium = Number(formData.addHealthInsurancePremium);
      if (formData.insuredDependents) payload.insuredDependents = Number(formData.insuredDependents);
      if (formData.insuranceJoinDate) payload.insuranceJoinDate = formData.insuranceJoinDate;
      if (formData.dependentsCount) payload.dependentsCount = Number(formData.dependentsCount);

      // Add retirement information
      if (formData.laborRetirementSalary) payload.laborRetirementSalary = Number(formData.laborRetirementSalary);
      if (formData.selfContributionRatio) payload.selfContributionRatio = Number(formData.selfContributionRatio);
      if (formData.selfContributionAmount) payload.selfContributionAmount = Number(formData.selfContributionAmount);
      if (formData.companyContributionAmount) payload.companyContributionAmount = Number(formData.companyContributionAmount);

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
  const handleLeaveChipClick = (leaveData: LeaveData | null) => {
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
        leaves: [],
        adjustments: []
      }
    });
    // Refresh leave info after closing the dialog
    if (employee?.empID && employee?.hireDate) {
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
                  {variables.department.map((variable) => (
                    <MenuItem key={variable._id} value={variable.code}>
                      {variable.description}
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

            {/* Extended Basic Information Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Chip label="詳細資料" color="primary" size="small" />
              </Divider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="身份證號"
                value={formData.idNumber}
                onChange={(e) => handleInputChange('idNumber', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="出生日期"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                disabled={loading}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>性別</InputLabel>
                <Select
                  value={formData.gender}
                  label="性別"
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  disabled={loading}
                >
                  {variables.gender.map((variable) => (
                    <MenuItem key={variable._id} value={variable.code}>
                      {variable.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>學歷</InputLabel>
                <Select
                  value={formData.education}
                  label="學歷"
                  onChange={(e) => handleInputChange('education', e.target.value)}
                  disabled={loading}
                >
                  {variables.education.map((variable) => (
                    <MenuItem key={variable._id} value={variable.code}>
                      {variable.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>血型</InputLabel>
                <Select
                  value={formData.bloodType}
                  label="血型"
                  onChange={(e) => handleInputChange('bloodType', e.target.value)}
                  disabled={loading}
                >
                  {variables.bloodType.map((variable) => (
                    <MenuItem key={variable._id} value={variable.code}>
                      {variable.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="籍貫"
                value={formData.birthPlace}
                onChange={(e) => handleInputChange('birthPlace', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="電話"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="銀行帳號"
                value={formData.bankAccount}
                onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="住址"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                disabled={loading}
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>婚姻狀態</InputLabel>
                <Select
                  value={formData.maritalStatus}
                  label="婚姻狀態"
                  onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                  disabled={loading}
                >
                  {variables.maritalStatus.map((variable) => (
                    <MenuItem key={variable._id} value={variable.code}>
                      {variable.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Job Information Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Chip label="職務資訊" color="primary" size="small" />
              </Divider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>職稱</InputLabel>
                <Select
                  value={formData.jobTitle}
                  label="職稱"
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  disabled={loading}
                >
                  {variables.jobType.map((variable) => (
                    <MenuItem key={variable._id} value={variable.code}>
                      {variable.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>職等</InputLabel>
                <Select
                  value={formData.jobLevel}
                  label="職等"
                  onChange={(e) => handleInputChange('jobLevel', e.target.value)}
                  disabled={loading}
                >
                  {variables.jobLevel.map((variable) => (
                    <MenuItem key={variable._id} value={variable.code}>
                      {variable.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>班別</InputLabel>
                <Select
                  value={formData.shift}
                  label="班別"
                  onChange={(e) => handleInputChange('shift', e.target.value)}
                  disabled={loading}
                >
                  {variables.shift.map((variable) => (
                    <MenuItem key={variable._id} value={variable.code}>
                      {variable.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="離職日期"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                disabled={loading}
                InputLabelProps={{ shrink: true }}
              />
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
                    label="薪水（總計）"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => handleInputChange('salary', e.target.value)}
                    error={!!errors.salary}
                    helperText={errors.salary || 'NT$ 月薪總計'}
                    disabled={loading}
                    inputProps={{
                      min: 0,
                      step: 1000
                    }}
                  />
                </Grid>

                {/* Salary Breakdown Section */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Chip
                      label="薪資明細"
                      color="secondary"
                      size="small"
                      icon={<LockIcon />}
                    />
                  </Divider>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="底薪"
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) => handleInputChange('baseSalary', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 1000 }}
                    helperText="NT$"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="職務加給"
                    type="number"
                    value={formData.jobAllowance}
                    onChange={(e) => handleInputChange('jobAllowance', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 100 }}
                    helperText="NT$"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="職等加給"
                    type="number"
                    value={formData.dutyAllowance}
                    onChange={(e) => handleInputChange('dutyAllowance', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 100 }}
                    helperText="NT$"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="專業加給"
                    type="number"
                    value={formData.professionalAllowance}
                    onChange={(e) => handleInputChange('professionalAllowance', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 100 }}
                    helperText="NT$"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="特別加給"
                    type="number"
                    value={formData.specialAllowance}
                    onChange={(e) => handleInputChange('specialAllowance', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 100 }}
                    helperText="NT$"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="工作津貼"
                    type="number"
                    value={formData.workSubsidy}
                    onChange={(e) => handleInputChange('workSubsidy', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 100 }}
                    helperText="NT$"
                  />
                </Grid>

                {/* Insurance Information Section */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Chip
                      label="保險資訊"
                      color="secondary"
                      size="small"
                      icon={<LockIcon />}
                    />
                  </Divider>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="勞保薪資"
                    type="number"
                    value={formData.laborInsuranceSalary}
                    onChange={(e) => handleInputChange('laborInsuranceSalary', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 1000 }}
                    helperText="NT$ 投保薪資"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="勞保費"
                    type="number"
                    value={formData.laborInsurancePremium}
                    onChange={(e) => handleInputChange('laborInsurancePremium', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 10 }}
                    helperText="NT$"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="加勞保費"
                    type="number"
                    value={formData.addLaborInsurancePremium}
                    onChange={(e) => handleInputChange('addLaborInsurancePremium', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 10 }}
                    helperText="NT$"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="健保薪資"
                    type="number"
                    value={formData.healthInsuranceSalary}
                    onChange={(e) => handleInputChange('healthInsuranceSalary', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 1000 }}
                    helperText="NT$ 投保薪資"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="健保費"
                    type="number"
                    value={formData.healthInsurancePremium}
                    onChange={(e) => handleInputChange('healthInsurancePremium', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 10 }}
                    helperText="NT$"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="加健保費"
                    type="number"
                    value={formData.addHealthInsurancePremium}
                    onChange={(e) => handleInputChange('addHealthInsurancePremium', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 10 }}
                    helperText="NT$"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="眷保人數"
                    type="number"
                    value={formData.insuredDependents}
                    onChange={(e) => handleInputChange('insuredDependents', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 1 }}
                    helperText="人"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="加保日期"
                    type="date"
                    value={formData.insuranceJoinDate}
                    onChange={(e) => handleInputChange('insuranceJoinDate', e.target.value)}
                    disabled={loading}
                    InputLabelProps={{ shrink: true }}
                    helperText="勞健保加保日期"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="扶養人數"
                    type="number"
                    value={formData.dependentsCount}
                    onChange={(e) => handleInputChange('dependentsCount', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 1 }}
                    helperText="人"
                  />
                </Grid>

                {/* Retirement Information Section */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Chip
                      label="退休金資訊"
                      color="secondary"
                      size="small"
                      icon={<LockIcon />}
                    />
                  </Divider>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="勞退薪資"
                    type="number"
                    value={formData.laborRetirementSalary}
                    onChange={(e) => handleInputChange('laborRetirementSalary', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 1000 }}
                    helperText="NT$ 提繳工資"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="自提勞退比例"
                    type="number"
                    value={formData.selfContributionRatio}
                    onChange={(e) => handleInputChange('selfContributionRatio', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    helperText="%"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="自提勞退金"
                    type="number"
                    value={formData.selfContributionAmount}
                    onChange={(e) => handleInputChange('selfContributionAmount', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 10 }}
                    helperText="NT$"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="公提勞退金"
                    type="number"
                    value={formData.companyContributionAmount}
                    onChange={(e) => handleInputChange('companyContributionAmount', e.target.value)}
                    disabled={loading}
                    inputProps={{ min: 0, step: 10 }}
                    helperText="NT$"
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
          hireDate={employee.hireDate}
        />
      )}
    </Dialog>
  );
};

export default AddEditEmployeeModal;