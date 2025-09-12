import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Lock as LockIcon,
  Person as PersonIcon,
  Save as SaveIcon,
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

const profileSchema = yup.object({
  description: yup.string().max(1000, '描述不能超過 1000 個字元'),
});

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileFormData {
  description?: string;
}

const SettingsPage: React.FC = () => {
  const { user, changePassword, updateProfile, loading } = useAuth();
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: yupResolver(passwordSchema),
  });

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    setValue: setProfileValue,
  } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      description: user?.description || '',
    },
  });

  React.useEffect(() => {
    if (user?.description) {
      setProfileValue('description', user.description);
    }
  }, [user?.description, setProfileValue]);

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

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      setProfileLoading(true);
      await updateProfile({
        description: data.description || '',
      });
    } catch (error) {
      // Error is handled by AuthContext
    } finally {
      setProfileLoading(false);
    }
  };

  const getUserLevelText = (level: number): string => {
    switch (level) {
      case 0:
        return '管理員';
      case 1:
        return '助理';
      case 2:
        return '使用者';
      default:
        return "使用者";
    }
  };

  const getUserLevelColor = (level: number): string => {
    switch (level) {
      case 0:
        return '#1976d2';
      case 1:
        return '#388e3c';
      case 2:
        return '#f57c00';
      case 3:
        return '#9c27b0';
      default:
        return '#666';
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
                      label="使用者名稱"
                      value={user.account}
                      fullWidth
                      disabled
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="電子郵件"
                      value={user.email}
                      fullWidth
                      disabled
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{display:"none"}}>
                    <TextField
                      label="使用者等級"
                      value={getUserLevelText(user.level)}
                      fullWidth
                      disabled
                      variant="outlined"
                      sx={{
                        '& .MuiInputBase-input': {
                          color: getUserLevelColor(user.level),
                          fontWeight: 'bold',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{display:"none"}}>
                    <TextField
                      label="加入日期"
                      value={new Date(user.created_at).toLocaleDateString()}
                      fullWidth
                      disabled
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              )}

              <Divider sx={{ mb: 3 }} />

              <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="個人描述（提供 AI 參考）"
                      placeholder="輸入你的個人描述，AI 助手將能給予更個人化的回應。"
                      multiline
                      rows={4}
                      fullWidth
                      variant="outlined"
                      {...registerProfile('description')}
                      error={!!profileErrors.description}
                      helperText={profileErrors.description?.message}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      這段描述會提供給 AI 助手，用來理解你的角色並給出更個人化的回應。
                    </Alert>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={profileLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                      disabled={profileLoading}
                    >
                      {profileLoading ? '更新中...' : '更新個人資訊'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
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