import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/Layout/AppLayout';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import SettingsTab from './components/Settings/SettingsTab';
import AttendanceTab from './components/Attendance/AttendanceTab';
import EmployeeManagement from './components/Employee/EmployeeManagement';
import AskLeaveTab from './components/Leave/AskLeaveTab';
import ApproveLeaveTab from './components/Leave/ApproveLeaveTab';
import PostClockTab from './components/PostClock/PostClockTab';
import BusinessTripTab from './components/BusinessTrip/BusinessTripTab';
import VariableManagement from './components/Variable/VariableManagement';
import { CalendarTab } from './components/Calendar/CalendarTab';
import { KanbanPage } from './pages/KanbanPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/chat" replace />;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginForm />
          </PublicRoute>
        }
      />
      
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterForm />
          </PublicRoute>
        }
      />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/attendance" replace />} />
        <Route path="attendance" element={<AttendanceTab />} />
        <Route path="employees" element={<EmployeeManagement />} />
        <Route path="leave/ask" element={<AskLeaveTab />} />
        <Route path="leave/approve" element={<ApproveLeaveTab />} />
        <Route path="postclock" element={<PostClockTab />} />
        <Route path="business-trip" element={<BusinessTripTab />} />
        <Route path="variables" element={<VariableManagement />} />
        <Route path="calendar" element={<CalendarTab />} />
        <Route path="settings" element={<SettingsTab />} />
      </Route>

      {/* Kanban route - standalone, not in main layout */}
      <Route
        path="/kanban"
        element={
          <ProtectedRoute>
            <KanbanPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;