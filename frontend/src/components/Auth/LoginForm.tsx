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
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AuthRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const LoginForm: React.FC = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthRequest>();

  const onSubmit = async (data: AuthRequest) => {
    try {
      await login(data);
      console.log("1")
      navigate('/attendance');
    } catch (error) {
      console.log("2")
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
              台龍電子人資系統
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
              登入
            </Typography>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="empID"
                label="員工編號"
                autoComplete="username"
                autoFocus
                error={!!errors.empID}
                helperText={errors.empID?.message}
                {...register('empID', {
                  required: '請輸入員工編號',
                })}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label="密碼"
                type="password"
                id="password"
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                {...register('password', {
                  required: '請輸入密碼',
                  minLength: {
                    value: 6,
                    message: '密碼至少需 6 個字元',
                  },
                })}
              />

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
                  '登入'
                )}
              </Button>

              <Box textAlign="center">
                <Link component={RouterLink} to="/register" variant="body2">
                  還沒有帳號嗎，去註冊
                </Link>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default LoginForm;