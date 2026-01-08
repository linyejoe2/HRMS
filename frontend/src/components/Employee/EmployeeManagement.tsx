import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  Grid,
  IconButton,
  Pagination,
  InputAdornment,
  Tooltip,
  Dialog
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { employeeAPI, variableAPI } from '../../services/api';
import { Employee, UserLevel, Variable } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import AddEditEmployeeModal from './AddEditEmployeeModal';
import { toast } from 'react-toastify';

const EmployeeManagement: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState<Variable[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    employee: Employee | null;
    action: 'activate' | 'deactivate';
  }>({ open: false, employee: null, action: 'deactivate' });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    employee: Employee | null;
  }>({ open: false, employee: null });
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{
    open: boolean;
    employee: Employee | null;
  }>({ open: false, employee: null });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetConfirmName, setResetConfirmName] = useState('');

  const limit = 100;

  // Check permissions
  const isAdminOrHr = user?.role === UserLevel.ADMIN || user?.role === UserLevel.HR;

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await variableAPI.getAll(undefined, false); // Only get active variables
      const allVariables = response.data.data.variables;
      const departmentVars = allVariables.filter((v: Variable) => v.section === 'department');
      setDepartments(departmentVars);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // Load employees
  const loadEmployees = async (currentPage: number = page) => {
    setLoading(true);
    try {
      const response = await employeeAPI.getAll(currentPage, limit, selectedDepartment);
      setEmployees(response.data.data.employees || []);
      setTotal(response.data.data.total || 0);
      setTotalPages(response.data.data.pages || 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || '載入員工資料失敗');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Search employees
  const searchEmployees = async () => {
    if (!searchQuery.trim()) {
      loadEmployees(1);
      return;
    }

    setLoading(true);
    try {
      const response = await employeeAPI.search(searchQuery);
      setEmployees(response.data.data.employees || []);
      setTotal(response.data.data.employees?.length || 0);
      setTotalPages(1);
      setPage(1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || '搜尋員工失敗');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    searchEmployees();
  };

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);
    
    // Auto-search when input is cleared
    if (!value.trim()) {
      loadEmployees(1);
    }
  };

  // Handle search on Enter key
  const handleSearchKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle page change
  const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
    loadEmployees(newPage);
  };

  // Handle add employee
  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setModalOpen(true);
  };

  // Handle edit employee
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setModalOpen(false);
    setEditingEmployee(null);
  };

  // Handle employee saved
  const handleEmployeeSaved = () => {
    handleModalClose();
    loadEmployees(page);
    toast.success(editingEmployee ? '員工資料更新成功' : '員工新增成功');
  };

  // Handle deactivate confirmation
  const handleDeactivateClick = (employee: Employee) => {
    setConfirmDialog({
      open: true,
      employee,
      action: employee.isActive ? 'deactivate' : 'activate'
    });
  };

  // Handle confirm action
  const handleConfirmAction = async () => {
    if (!confirmDialog.employee) return;

    try {
      if (confirmDialog.action === 'deactivate') {
        await employeeAPI.update(confirmDialog.employee._id!, { isActive: false });
        toast.success('員工已停用');
      } else {
        // For reactivation, we update the employee with isActive: true
        await employeeAPI.update(confirmDialog.employee._id!, { isActive: true });
        toast.success('員工已重新啟用');
      }

      setConfirmDialog({ open: false, employee: null, action: 'deactivate' });
      loadEmployees(page);
    } catch (err: any) {
      toast.error(err.response?.data?.error || '操作失敗');
    }
  };

  // Handle delete employee click
  const handleDeleteClick = (employee: Employee) => {
    setDeleteDialog({
      open: true,
      employee
    });
    setDeleteConfirmName('');
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteDialog.employee) return;

    // Validate name confirmation
    if (deleteConfirmName !== deleteDialog.employee.name) {
      toast.error('輸入的姓名不正確');
      return;
    }

    try {
      await employeeAPI.delete(deleteDialog.employee._id!);
      toast.success('員工已刪除');
      setDeleteDialog({ open: false, employee: null });
      setDeleteConfirmName('');
      loadEmployees(page);
    } catch (err: any) {
      toast.error(err.response?.data?.error || '刪除失敗');
    }
  };

  // Handle close delete dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialog({ open: false, employee: null });
    setDeleteConfirmName('');
  };

  // Handle reset password click
  const handleResetPasswordClick = (employee: Employee) => {
    setResetPasswordDialog({
      open: true,
      employee
    });
    setNewPassword('');
    setConfirmPassword('');
    setResetConfirmName('');
  };

  // Handle confirm reset password
  const handleConfirmResetPassword = async () => {
    if (!resetPasswordDialog.employee) return;

    // Validate passwords
    if (!newPassword || !confirmPassword) {
      toast.error('請輸入新密碼');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('新密碼與確認密碼不一致');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('密碼長度至少需要 6 個字元');
      return;
    }

    // Validate name confirmation
    if (resetConfirmName !== resetPasswordDialog.employee.name) {
      toast.error('輸入的姓名不正確');
      return;
    }

    try {
      await employeeAPI.resetPassword(resetPasswordDialog.employee._id!, newPassword);
      toast.success('密碼重置成功');
      handleCloseResetPasswordDialog();
    } catch (err: any) {
      toast.error(err.response?.data?.message || '密碼重置失敗');
    }
  };

  // Handle close reset password dialog
  const handleCloseResetPasswordDialog = () => {
    setResetPasswordDialog({ open: false, employee: null });
    setNewPassword('');
    setConfirmPassword('');
    setResetConfirmName('');
  };

  // Get role display text
  const getRoleText = (role: UserLevel) => {
    switch (role) {
      case UserLevel.ADMIN: return '管理員';
      case UserLevel.HR: return '人資';
      case UserLevel.MANAGER: return '主管';
      case UserLevel.EMPLOYEE: return '員工';
      default: return role;
    }
  };

  // Get role color
  const getRoleColor = (role: UserLevel): 'primary' | 'secondary' | 'success' | 'warning' => {
    switch (role) {
      case UserLevel.ADMIN: return 'primary';
      case UserLevel.HR: return 'secondary';
      case UserLevel.MANAGER: return 'success';
      case UserLevel.EMPLOYEE: return 'warning';
      default: return 'warning';
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  // Get department description from code
  const getDepartmentDescription = (code?: string) => {
    if (!code) return '-';
    const dept = departments.find(d => d.code === code);
    return dept ? dept.description : code;
  };

  // Fetch departments on mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Load employees on mount and when department filter changes
  useEffect(() => {
    loadEmployees(1);
    setPage(1);
  }, [selectedDepartment]);

  // Check if user has permission to access this page
  if (!isAdminOrHr) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          權限不足
        </Typography>
        <Typography variant="body1" color="text.secondary">
          您沒有權限存取員工管理功能。
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        員工管理
      </Typography>

      {/* Search and Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="搜尋員工姓名、員工編號..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyPress={handleSearchKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                // label="部門篩選"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="">所有部門</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.code}>
                    {dept.description}
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                onClick={handleSearch}
                disabled={loading}
                sx={{ mr: 1 }}
              >
                搜尋
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddEmployee}
                disabled={loading}
              >
                新增員工
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary">
                共 {total} 位員工
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" sx={{ mb: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Employee Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>員工編號</TableCell>
                  <TableCell>姓名</TableCell>
                  <TableCell>部門</TableCell>
                  <TableCell>系統等級</TableCell>
                  <TableCell>狀態</TableCell>
                  <TableCell>最後登入</TableCell>
                  <TableCell>入職日</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary">
                        {loading ? '載入中...' : searchQuery ? '找不到符合條件的員工' : '尚無員工資料'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee._id} hover>
                      <TableCell>{employee.empID}</TableCell>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell>{getDepartmentDescription(employee.department)}</TableCell>
                      <TableCell>
                        <Chip
                          label={getRoleText(employee.role)}
                          color={getRoleColor(employee.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={employee.isActive ? '啟用' : '停用'}
                          color={employee.isActive ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(employee.lastLogin)}</TableCell>
                      <TableCell>{formatDate(employee.hireDate)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="編輯員工">
                          <IconButton
                            size="small"
                            onClick={() => handleEditEmployee(employee)}
                            disabled={loading}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="重製密碼">
                          <IconButton
                            size="small"
                            onClick={() => handleResetPasswordClick(employee)}
                            disabled={loading || user?.role !== UserLevel.ADMIN}
                            color="warning"
                          >
                            <VpnKeyIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={employee.isActive ? '停用員工' : '啟用員工'}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeactivateClick(employee)}
                            disabled={loading || (user?.role !== UserLevel.ADMIN && !employee.isActive)}
                            color={employee.isActive ? 'error' : 'success'}
                          >
                            {employee.isActive ? <PersonOffIcon /> : <PersonIcon />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="刪除員工">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(employee)}
                            disabled={loading || user?.role !== UserLevel.ADMIN}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                disabled={loading}
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Employee Modal */}
      <AddEditEmployeeModal
        open={modalOpen}
        employee={editingEmployee}
        onClose={handleModalClose}
        onSaved={handleEmployeeSaved}
      />

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, employee: null, action: 'deactivate' })}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            確認{confirmDialog.action === 'deactivate' ? '停用' : '啟用'}員工
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            確定要{confirmDialog.action === 'deactivate' ? '停用' : '啟用'}員工
            <strong>{confirmDialog.employee?.name}</strong> ({confirmDialog.employee?.empID}) 嗎？
            {confirmDialog.action === 'deactivate' && (
              <>
                <br />
                <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                  停用後該員工將無法登入系統。
                </Typography>
              </>
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              onClick={() => setConfirmDialog({ open: false, employee: null, action: 'deactivate' })}
            >
              取消
            </Button>
            <Button
              variant="contained"
              color={confirmDialog.action === 'deactivate' ? 'error' : 'success'}
              onClick={handleConfirmAction}
            >
              確認{confirmDialog.action === 'deactivate' ? '停用' : '啟用'}
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom color="error">
            刪除員工
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            您即將刪除員工 <strong>{deleteDialog.employee?.name}</strong> ({deleteDialog.employee?.empID})
          </Typography>
          <Typography variant="body2" color="error" sx={{ mb: 3 }}>
            警告：此操作無法復原！刪除後該員工的所有資料將永久移除。
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            請輸入員工姓名 <strong>{deleteDialog.employee?.name}</strong> 以確認刪除：
          </Typography>
          <TextField
            fullWidth
            placeholder="請輸入員工姓名"
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            sx={{ mb: 3 }}
            autoFocus
          />
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              onClick={handleCloseDeleteDialog}
            >
              取消
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDelete}
              disabled={deleteConfirmName !== deleteDialog.employee?.name}
            >
              確認刪除
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetPasswordDialog.open}
        onClose={handleCloseResetPasswordDialog}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom color="warning.main">
            重製密碼
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            重製員工 <strong>{resetPasswordDialog.employee?.name}</strong> ({resetPasswordDialog.employee?.empID}) 的密碼
          </Typography>

          <TextField
            fullWidth
            type="password"
            label="新密碼"
            placeholder="請輸入新密碼"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mb: 2 }}
            autoFocus
          />

          <TextField
            fullWidth
            type="password"
            label="確認新密碼"
            placeholder="請再次輸入新密碼"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" sx={{ mb: 1 }}>
            確認重製 請在此輸入 <strong>{resetPasswordDialog.employee?.name}</strong>
          </Typography>
          <TextField
            fullWidth
            placeholder="請輸入員工姓名"
            value={resetConfirmName}
            onChange={(e) => setResetConfirmName(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              onClick={handleCloseResetPasswordDialog}
            >
              取消
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleConfirmResetPassword}
              disabled={
                !newPassword ||
                !confirmPassword ||
                resetConfirmName !== resetPasswordDialog.employee?.name
              }
            >
              確認
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default EmployeeManagement;