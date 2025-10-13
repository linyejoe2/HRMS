import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthRequest, RegisterRequest, ChangePasswordRequest, UpdateProfileRequest } from '../types';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: AuthRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  changePassword: (passwordData: ChangePasswordRequest) => Promise<void>;
  updateProfile: (profileData: UpdateProfileRequest) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authAPI.getMe();
      setUser(response.data.data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials: AuthRequest) => {
    try {
      setLoading(true);
      const response = await authAPI.login(credentials);
      const { token, employee } = response.data.data;
      
      localStorage.setItem('auth_token', token);
      setUser(employee);
      toast.success('成功登入!');
    } catch (error: any) {
      console.error('Login failed:', error);
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      setLoading(true);
      const response = await authAPI.register(userData);
      const { token, employee } = response.data.data;
      
      localStorage.setItem('auth_token', token);
      setUser(employee);
      toast.success(response.data.message);
    } catch (error: any) {
      console.error('Registration failed:', error);
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    toast.success('成功登出');
  };

  const changePassword = async (passwordData: ChangePasswordRequest) => {
    try {
      setLoading(true);
      const res = await authAPI.changePassword(passwordData);
      toast.success(res.data.message);
    } catch (error: any) {
      console.error('Change password failed:', error);
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData: UpdateProfileRequest) => {
    try {
      setLoading(true);
      const response = await authAPI.updateProfile(profileData);
      setUser(response.data.data.employee);
      toast.success(response.data.message);
    } catch (error: any) {
      console.error('Update profile failed:', error);
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    changePassword,
    updateProfile,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};