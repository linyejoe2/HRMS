import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, CircularProgress, Tooltip, IconButton } from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';
import { queryLeaveRequests, authAPI } from '../../services/api';
import { LeaveRequest } from '../../types';
import { toast } from 'react-toastify';
import {
  calculateRemainingPersonalLeaveMinutes,
  calculateRemainingSickLeaveMinutes,
  calculateRemainingSpecialLeaveMinutes,
  calculateUsedMinutes,
  minutesToHours,
  getLeaveColorByHours,
  calculateSpecialLeaveEntitlementCumulativeDays,
  formatMinutesToHours
} from '../../utils/leaveCalculations';

interface RemainingLeaveLabelProps {
  onLabelClick: (leaveType: string, leaves: LeaveRequest[], hireDate?: Date) => void;
}

interface RemainingLeaveData {
  type: string;
  displayName: string;
  totalHours: number;
  usedHours: number;
  remainingHours: number;
  leaves: LeaveRequest[];
}

const RemainingLeaveLabels: React.FC<RemainingLeaveLabelProps> = ({ onLabelClick }) => {
  const [loading, setLoading] = useState(true);
  const [personalLeave, setPersonalLeave] = useState<RemainingLeaveData | null>(null);
  const [sickLeave, setSickLeave] = useState<RemainingLeaveData | null>(null);
  const [specialLeave, setSpecialLeave] = useState<RemainingLeaveData | null>(null);
  const [hireDate, setHireDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchRemainingLeave();
  }, []);

  const fetchRemainingLeave = async () => {
    try {
      setLoading(true);

      // Fetch employee data to get hire date
      const employeeResponse = await authAPI.getMe();
      const employeeHireDate = employeeResponse.data.data.user?.hireDate;

      if (employeeHireDate) {
        setHireDate(new Date(employeeHireDate));
      }

      // Calculate date range for past 1 year
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      // Query for "事假" (Personal Leave)
      const personalLeaveResponse = await queryLeaveRequests({
        timeStart: oneYearAgo.toISOString(),
        timeEnd: now.toISOString(),
        leaveType: '事假',
        status: 'approved'
      });

      // Query for "病假" (Sick Leave - 普通傷病假)
      const sickLeaveResponse = await queryLeaveRequests({
        timeStart: oneYearAgo.toISOString(),
        timeEnd: now.toISOString(),
        leaveType: '普通傷病假',
        status: 'approved'
      });

      // Query for "特休" (Special Leave - 特別休假)
      const specialLeaveResponse = await queryLeaveRequests({
        timeStart: oneYearAgo.toISOString(),
        timeEnd: now.toISOString(),
        leaveType: '特別休假',
        status: 'approved'
      });

      // Calculate personal leave using utility function
      const personalLeaves = personalLeaveResponse.data.data;
      const personalRemainingHours = formatMinutesToHours(calculateRemainingPersonalLeaveMinutes(personalLeaves));
      const personalUsedMinutes = calculateUsedMinutes(personalLeaves);
      const personalUsedHours = minutesToHours(personalUsedMinutes);
      const personalTotalHours = 14 * 8; // 14 days * 8 hours = 112 hours

      setPersonalLeave({
        type: '事假',
        displayName: '事假',
        totalHours: personalTotalHours,
        usedHours: personalUsedHours,
        remainingHours: personalRemainingHours,
        leaves: personalLeaves
      });

      // Calculate sick leave using utility function
      const sickLeaves = sickLeaveResponse.data.data;
      const sickRemainingHours = formatMinutesToHours(calculateRemainingSickLeaveMinutes(sickLeaves));
      const sickUsedMinutes = calculateUsedMinutes(sickLeaves);
      const sickUsedHours = minutesToHours(sickUsedMinutes);
      const sickTotalHours = 30 * 8; // 30 days * 8 hours = 240 hours

      setSickLeave({
        type: '普通傷病假',
        displayName: '病假',
        totalHours: sickTotalHours,
        usedHours: sickUsedHours,
        remainingHours: sickRemainingHours,
        leaves: sickLeaves
      });

      // Calculate special leave using utility function
      const specialLeaves = specialLeaveResponse.data.data;
      const hireDateObj = employeeHireDate ? new Date(employeeHireDate) : undefined;
      const specialRemainingHours = formatMinutesToHours(calculateRemainingSpecialLeaveMinutes(specialLeaves, hireDateObj));
      const specialUsedMinutes = calculateUsedMinutes(specialLeaves);
      const specialUsedHours = minutesToHours(specialUsedMinutes);
      const specialTotalDays = hireDateObj ? calculateSpecialLeaveEntitlementCumulativeDays(hireDateObj) : 0;
      const specialTotalHours = specialTotalDays * 8;

      setSpecialLeave({
        type: '特別休假',
        displayName: '特休',
        totalHours: specialTotalHours,
        usedHours: specialUsedHours,
        remainingHours: specialRemainingHours,
        leaves: specialLeaves
      });

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
          onClick={() => onLabelClick(personalLeave.type, personalLeave.leaves)}
          sx={{ cursor: 'pointer', fontWeight: 'medium' }}
        />
      )}

      {sickLeave && (
        <Chip
          label={`病假：${sickLeave.remainingHours} 小時`}
          color={getLeaveColorByHours(sickLeave.remainingHours)}
          onClick={() => onLabelClick(sickLeave.type, sickLeave.leaves)}
          sx={{ cursor: 'pointer', fontWeight: 'medium' }}
        />
      )}

      {specialLeave && (
        <Chip
          label={`特休：${specialLeave.remainingHours} 小時`}
          color={getLeaveColorByHours(specialLeave.remainingHours)}
          onClick={() => onLabelClick(specialLeave.type, specialLeave.leaves, hireDate || undefined)}
          sx={{ cursor: 'pointer', fontWeight: 'medium' }}
        />
      )}
    </Box>
  );
};

export default RemainingLeaveLabels;
