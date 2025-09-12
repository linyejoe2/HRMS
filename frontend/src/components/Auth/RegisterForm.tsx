import React from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { RegisterRequest, UserLevel } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const RegisterForm: React.FC = () => {
  const { register: registerUser, loading } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm<RegisterRequest & { confirmPassword: string }>();

  const password = watch('password');

  const onSubmit = async (data: RegisterRequest & { confirmPassword: string }) => {
    try {
      const { confirmPassword, ...registerData } = data;
      await registerUser(registerData);
      navigate('/chat');
    } catch (error) {
      // Error is handled by AuthContext
    }
  };


  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography component="h1" variant="h4" align="center" gutterBottom>
              律師助手
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
              建立帳號
            </Typography>
            
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="account"
                label="帳號"
                autoComplete="username"
                autoFocus
                error={!!errors.account}
                helperText={errors.account?.message}
                {...register('account', {
                  required: '請輸入使用者名稱',
                  minLength: {
                    value: 3,
                    message: '使用者名稱至少需 3 個字元',
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message: '使用者名稱僅可包含英文字母、數字和底線',
                  },
                })}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="電子郵件"
                type="email"
                autoComplete="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register('email', {
                  required: '請輸入電子郵件',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: '無效的電子郵件格式',
                  },
                })}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                label="密碼"
                type="password"
                id="password"
                autoComplete="new-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                {...register('password', {
                  required: '請輸入密碼',
                  minLength: {
                    value: 8,
                    message: '密碼至少需 8 個字元',
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                    message: '密碼需包含大寫、小寫字母、數字和特殊符號',
                  },
                })}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                label="確認密碼"
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                {...register('confirmPassword', {
                  required: '請再次輸入密碼',
                  validate: (value) => value === password || '兩次輸入的密碼不一致',
                })}
              />
              
              <FormControl 
                fullWidth 
                margin="normal" 
                error={!!errors.level}
                sx={{display:"none"}}
              >
                <InputLabel id="level-label">User Level</InputLabel>
                <Controller
                  name="level"
                  control={control}
                  defaultValue={UserLevel.CLIENT}
                  rules={{ required: 'User level is required' }}
                  render={({ field }) => (
                    <Select
                      labelId="level-label"
                      label="User Level"
                      {...field}
                    >
                      <MenuItem value={UserLevel.CLIENT} selected={true}>使用者</MenuItem>
                    </Select>
                  )}
                />
                {errors.level && (
                  <FormHelperText>{errors.level.message}</FormHelperText>
                )}
              </FormControl>
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  '建立帳號'
                )}
              </Button>
              
              <Box textAlign="center">
                <Link component={RouterLink} to="/login" variant="body2">
                  已經有帳號了？前往登入
                </Link>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default RegisterForm;