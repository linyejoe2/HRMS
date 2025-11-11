import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, CircularProgress, Tooltip, IconButton } from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';
import { authAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { getLeaveColorByHours } from '../../utils/leaveCalculations';
import { fetchUserLeaveData, LeaveData } from '../../services/leaveService';

interface RemainingLeaveLabelProps {
  onLabelClick: (leaveData: LeaveData, hireDate?: Date) => void;
}

const RemainingLeaveLabels: React.FC<RemainingLeaveLabelProps> = ({ onLabelClick }) => {
  const [loading, setLoading] = useState(true);
  const [personalLeave, setPersonalLeave] = useState<LeaveData | null>(null);
  const [sickLeave, setSickLeave] = useState<LeaveData | null>(null);
  const [specialLeave, setSpecialLeave] = useState<LeaveData | null>(null);
  const [hireDate, setHireDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchRemainingLeave();
  }, []);

  const fetchRemainingLeave = async () => {
    try {
      setLoading(true);

      // Fetch employee data to get hire date and empID
      const employeeResponse = await authAPI.getMe();
      const employeeHireDate = employeeResponse.data.data.user?.hireDate;
      const empID = employeeResponse.data.data.user?.empID;

      if (!employeeHireDate || !empID) {
        toast.error('無法取得員工資訊');
        return;
      }

      setHireDate(new Date(employeeHireDate));

      // Fetch all leave data using centralized service
      const leaveData = await fetchUserLeaveData(empID, employeeHireDate);

      setPersonalLeave(leaveData.personalLeave);
      setSickLeave(leaveData.sickLeave);
      setSpecialLeave(leaveData.specialLeave);

    } catch (error) {
      console.error('Error fetching remaining leave:', error);
      toast.error('無法載入剩餘假別資訊');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          mb: 3
        }}
      >
        <CircularProgress size={24} sx={{ mr: 2 }} />
        <Typography>載入剩餘假別中...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        mb: 3,
        backgroundColor: 'background.paper'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          剩餘假別
        </Typography>
        <Tooltip
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                顏色說明：
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: 'success.main'
                    }}
                  />
                  <Typography variant="body2">剩餘七天以上：綠色</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: 'warning.main'
                    }}
                  />
                  <Typography variant="body2">剩餘三天以上：橘色</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: 'error.main'
                    }}
                  />
                  <Typography variant="body2">剩餘三天以下：紅色</Typography>
                </Box>
              </Box>
            </Box>
          }
          arrow
          placement="right"
        >
          <IconButton size="small" sx={{ p: 0.5 }}>
            <HelpIcon fontSize="small" color="action" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', height: 24 }} />

      {personalLeave && (
        <Chip
          label={`事假：${personalLeave.remainingHours} 小時`}
          color={getLeaveColorByHours(personalLeave.remainingHours)}
          onClick={() => onLabelClick(personalLeave)}
          sx={{ cursor: 'pointer', fontWeight: 'medium' }}
        />
      )}

      {sickLeave && (
        <Chip
          label={`病假：${sickLeave.remainingHours} 小時`}
          color={getLeaveColorByHours(sickLeave.remainingHours)}
          onClick={() => onLabelClick(sickLeave)}
          sx={{ cursor: 'pointer', fontWeight: 'medium' }}
        />
      )}

      {specialLeave && (
        <Chip
          label={`特休：${specialLeave.remainingHours} 小時`}
          color={getLeaveColorByHours(specialLeave.remainingHours)}
          onClick={() => onLabelClick(specialLeave, hireDate || undefined)}
          sx={{ cursor: 'pointer', fontWeight: 'medium' }}
        />
      )}
    </Box>
  );
};

export default RemainingLeaveLabels;
