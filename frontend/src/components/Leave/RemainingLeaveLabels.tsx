import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, CircularProgress, Tooltip, IconButton } from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';
import { queryLeaveRequests, authAPI } from '../../services/api';
import { LeaveRequest } from '../../types';
import { toast } from 'react-toastify';

interface RemainingLeaveLabelProps {
  onLabelClick: (leaveType: string, leaves: LeaveRequest[], hireDate?: Date) => void;
}

interface RemainingLeaveData {
  type: string;
  displayName: string;
  totalHours: number;
  usedHours: number;
  remainingDays: number;
  leaves: LeaveRequest[];
}

// Utility function: Calculate used time from leaves
const calculateUsedTime = (leaves: LeaveRequest[]): { usedHours: number; usedMinutes: number; usedDays: number } => {
  const usedMinutes = leaves.reduce((total, leave) => {
    const hours = parseInt(leave.hour) || 0;
    const minutes = parseInt(leave.minutes) || 0;
    return total + (hours * 60) + minutes;
  }, 0);

  const usedHours = usedMinutes / 60;
  const usedDays = usedHours / 8;

  return { usedHours, usedMinutes, usedDays };
};

// Utility function: Calculate remaining personal leave days (事假)
export const calculateRemainingPersonalLeaveDays = (leaves: LeaveRequest[]): number => {
  const totalDays = 14; // 14 days per year
  const { usedDays } = calculateUsedTime(leaves);
  return Math.max(0, totalDays - usedDays);
};

// Utility function: Calculate remaining sick leave days (病假)
export const calculateRemainingSickLeaveDays = (leaves: LeaveRequest[]): number => {
  const totalDays = 30; // 30 days per year
  const { usedDays } = calculateUsedTime(leaves);
  return Math.max(0, totalDays - usedDays);
};

export const calculateSpecialLeaveEntitlement = (hireDate: Date): number => {
  const now = new Date();
  const hireDateObj = new Date(hireDate);

  // Calculate months of service
  const monthsDiff = (now.getFullYear() - hireDateObj.getFullYear()) * 12 +
    (now.getMonth() - hireDateObj.getMonth());

  // Calculate years of service (including partial years)
  const yearsDiff = monthsDiff / 12;

  if (monthsDiff < 6) {
    return 0; // Less than 6 months
  } else if (yearsDiff < 1) {
    return 3; // 6 months to 1 year
  } else if (yearsDiff < 2) {
    return 7; // 1-2 years
  } else if (yearsDiff < 3) {
    return 10; // 2-3 years
  } else if (yearsDiff < 5) {
    return 14; // 3-5 years
  } else if (yearsDiff < 10) {
    return 15; // 5-10 years
  } else {
    // 10 years and above: 16 + (years - 10), max 30 days
    const additionalYears = Math.floor(yearsDiff) - 10;
    return Math.min(16 + additionalYears, 30);
  }
};

// Utility function: Calculate cumulative special leave entitlement from hire date to now
// Examples:
//   - At 6 months: 3 days total
//   - At 1 year: 3 + 7 = 10 days total
//   - At 2 years: 3 + 7 + 10 = 20 days total
//   - At 3 years: 3 + 7 + 10 + 14 = 34 days total
//   - At 5 years: 3 + 7 + 10 + 14 + 14 + 15 = 63 days total
//   - At 10 years: 3 + 7 + 10 + (14×2) + (15×5) = 128 days total
//   - At 11 years: 128 + 16 = 144 days total
//   - At 12 years: 144 + 17 = 161 days total
export const calculateSpecialLeaveEntitlementCumulative = (hireDate: Date): number => {
  const now = new Date();
  const hireDateObj = new Date(hireDate);

  // Calculate months of service
  const monthsDiff = (now.getFullYear() - hireDateObj.getFullYear()) * 12 +
    (now.getMonth() - hireDateObj.getMonth());

  // Calculate full years of service
  const fullYears = Math.floor(monthsDiff / 12);

  let cumulativeDays = 0;

  // Less than 6 months: no leave
  if (monthsDiff < 6) {
    return 0;
  }

  // 6 months to 1 year: 3 days (one-time grant)
  if (monthsDiff >= 6) {
    cumulativeDays += 3;
  }

  // For each completed year, add the appropriate days
  for (let year = 1; year <= fullYears; year++) {
    if (year === 1) {
      // 1st year (1-2 years of service): 7 days
      cumulativeDays += 7;
    } else if (year === 2) {
      // 2nd year (2-3 years of service): 10 days
      cumulativeDays += 10;
    } else if (year >= 3 && year < 5) {
      // 3rd-4th year (3-5 years of service): 14 days per year
      cumulativeDays += 14;
    } else if (year >= 5 && year < 10) {
      // 5th-9th year (5-10 years of service): 15 days per year
      cumulativeDays += 15;
    } else if (year >= 10) {
      // 10th year and beyond: 16, 17, 18... days (max 30 per year)
      const yearsSince10 = year - 10;
      cumulativeDays += Math.min(16 + yearsSince10, 30);
    }
  }

  return cumulativeDays;
};

// Utility function: Calculate remaining special leave days (特休)
export const calculateRemainingSpecialLeaveDays = (leaves: LeaveRequest[], hireDate?: Date): number => {
  if (!hireDate) {
    return 0;
  }

  const totalDays = calculateSpecialLeaveEntitlementCumulative(hireDate);
  const { usedDays } = calculateUsedTime(leaves);
  return Math.max(0, totalDays - usedDays);
};

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
      const personalRemainingDays = calculateRemainingPersonalLeaveDays(personalLeaves);
      const personalUsed = calculateUsedTime(personalLeaves);
      const personalTotalHours = 14 * 8; // 14 days * 8 hours

      setPersonalLeave({
        type: '事假',
        displayName: '事假',
        totalHours: personalTotalHours,
        usedHours: personalUsed.usedHours,
        remainingDays: personalRemainingDays,
        leaves: personalLeaves
      });

      // Calculate sick leave using utility function
      const sickLeaves = sickLeaveResponse.data.data;
      const sickRemainingDays = calculateRemainingSickLeaveDays(sickLeaves);
      const sickUsed = calculateUsedTime(sickLeaves);
      const sickTotalHours = 30 * 8; // 30 days * 8 hours

      setSickLeave({
        type: '普通傷病假',
        displayName: '病假',
        totalHours: sickTotalHours,
        usedHours: sickUsed.usedHours,
        remainingDays: sickRemainingDays,
        leaves: sickLeaves
      });

      // Calculate special leave using utility function
      const specialLeaves = specialLeaveResponse.data.data;
      const hireDateObj = employeeHireDate ? new Date(employeeHireDate) : undefined;
      const specialRemainingDays = calculateRemainingSpecialLeaveDays(specialLeaves, hireDateObj);
      const specialUsed = calculateUsedTime(specialLeaves);
      const specialTotalDays = hireDateObj ? calculateSpecialLeaveEntitlementCumulative(hireDateObj) : 0;
      const specialTotalHours = specialTotalDays * 8;

      setSpecialLeave({
        type: '特別休假',
        displayName: '特休',
        totalHours: specialTotalHours,
        usedHours: specialUsed.usedHours,
        remainingDays: specialRemainingDays,
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
          label={`事假：${personalLeave.remainingDays.toFixed(1)} 天`}
          color={personalLeave.remainingDays > 7 ? 'success' : personalLeave.remainingDays > 3 ? 'warning' : 'error'}
          onClick={() => onLabelClick(personalLeave.type, personalLeave.leaves)}
          sx={{ cursor: 'pointer', fontWeight: 'medium' }}
        />
      )}

      {sickLeave && (
        <Chip
          label={`病假：${sickLeave.remainingDays.toFixed(1)} 天`}
          color={sickLeave.remainingDays > 15 ? 'success' : sickLeave.remainingDays > 7 ? 'warning' : 'error'}
          onClick={() => onLabelClick(sickLeave.type, sickLeave.leaves)}
          sx={{ cursor: 'pointer', fontWeight: 'medium' }}
        />
      )}

      {specialLeave && (
        <Chip
          label={`特休：${specialLeave.remainingDays.toFixed(1)} 天`}
          color={specialLeave.remainingDays > 7 ? 'success' : specialLeave.remainingDays > 3 ? 'warning' : 'error'}
          onClick={() => onLabelClick(specialLeave.type, specialLeave.leaves, hireDate || undefined)}
          sx={{ cursor: 'pointer', fontWeight: 'medium' }}
        />
      )}
    </Box>
  );
};

export default RemainingLeaveLabels;
