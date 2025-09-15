import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert, Snackbar } from '@mui/material';

interface AlertState {
  open: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  autoHideDuration?: number;
}

interface AlertContextType {
  showAlert: (message: string, severity?: AlertState['severity'], autoHideDuration?: number) => void;
  showError: (message: string, autoHideDuration?: number) => void;
  showSuccess: (message: string, autoHideDuration?: number) => void;
  showWarning: (message: string, autoHideDuration?: number) => void;
  showInfo: (message: string, autoHideDuration?: number) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: React.ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    message: '',
    severity: 'info',
    autoHideDuration: 6000,
  });

  const showAlert = useCallback((
    message: string, 
    severity: AlertState['severity'] = 'info',
    autoHideDuration: number = 6000
  ) => {
    setAlert({
      open: true,
      message,
      severity,
      autoHideDuration,
    });
  }, []);

  const showError = useCallback((message: string, autoHideDuration: number = 8000) => {
    showAlert(message, 'error', autoHideDuration);
  }, [showAlert]);

  const showSuccess = useCallback((message: string, autoHideDuration: number = 4000) => {
    showAlert(message, 'success', autoHideDuration);
  }, [showAlert]);

  const showWarning = useCallback((message: string, autoHideDuration: number = 6000) => {
    showAlert(message, 'warning', autoHideDuration);
  }, [showAlert]);

  const showInfo = useCallback((message: string, autoHideDuration: number = 6000) => {
    showAlert(message, 'info', autoHideDuration);
  }, [showAlert]);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, open: false }));
  }, []);

  const handleClose = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    hideAlert();
  };

  const value: AlertContextType = {
    showAlert,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    hideAlert,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      
      {/* Global Alert Component */}
      <Snackbar
        open={alert.open}
        autoHideDuration={alert.autoHideDuration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleClose} 
          severity={alert.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </AlertContext.Provider>
  );
};