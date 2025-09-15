import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  Lock as LockIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const passwordSchema = yup.object({
  currentPassword: yup
    .string()
    .required('必須輸入目前密碼')
    .min(6, '密碼至少需要 6 個字元'),
  newPassword: yup
    .string()
    .required('必須輸入新密碼')
    .min(6, '密碼至少需要 6 個字元'),
  confirmPassword: yup
    .string()
    .required('必須再次輸入新密碼')
    .oneOf([yup.ref('newPassword')], '兩次輸入的密碼必須相同'),
});

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const SettingsPage: React.FC = () => {
  const { user, changePassword, loading } = useAuth();
  const [passwordLoading, setPasswordLoading] = useState(false);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: yupResolver(passwordSchema),
  });


  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setPasswordLoading(true);
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      resetPassword();
    } catch (error) {
      // Error is handled by AuthContext
    } finally {
      setPasswordLoading(false);
    }
  };


  const getUserLevelText = (role: string): string => {
    switch (role) {
      case 'admin':
        return '管理員';
      case 'hr':
        return '人資';
      case 'manager':
        return '主管';
      case 'employee':
      default:
        return '員工';
    }
  };

  const getUserLevelColor = (role: string): string => {
    switch (role) {
      case 'admin':
        return '#f57c00';
      case 'hr':
        return '#1976d2';
      case 'manager':
        return '#7b1fa2';
      case 'employee':
      default:
        return '#388e3c';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      <Grid container spacing={3}>
        {/* User Profile Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">個人資訊</Typography>
              </Box>
              
              {user && (
                <Grid container spacing={2} mb={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="員工姓名"
                      value={user.name}
                      fullWidth
                      disabled
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="員工編號"
                      value={user.empID}
                      fullWidth
                      disabled
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="使用者等級"
                      value={getUserLevelText(user.role)}
                      fullWidth
                      disabled
                      variant="outlined"
                      sx={{
                        '& .MuiInputBase-input': {
                          color: getUserLevelColor(user.role),
                          fontWeight: 'bold',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="最後登入時間"
                      value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '未知'}
                      fullWidth
                      disabled
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              )}

            </CardContent>
          </Card>
        </Grid>

        {/* Change Password Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <LockIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">修改密碼</Typography>
              </Box>
              
              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="目前密碼"
                      type="password"
                      fullWidth
                      variant="outlined"
                      {...registerPassword('currentPassword')}
                      error={!!passwordErrors.currentPassword}
                      helperText={passwordErrors.currentPassword?.message}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="新密碼"
                      type="password"
                      fullWidth
                      variant="outlined"
                      {...registerPassword('newPassword')}
                      error={!!passwordErrors.newPassword}
                      helperText={passwordErrors.newPassword?.message}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="確認新密碼"
                      type="password"
                      fullWidth
                      variant="outlined"
                      {...registerPassword('confirmPassword')}
                      error={!!passwordErrors.confirmPassword}
                      helperText={passwordErrors.confirmPassword?.message}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={passwordLoading ? <CircularProgress size={20} /> : <LockIcon />}
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? '變更中...' : '變更密碼'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;