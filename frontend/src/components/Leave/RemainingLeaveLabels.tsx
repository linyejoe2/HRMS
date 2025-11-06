import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, CircularProgress } from '@mui/material';
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

const RemainingLeaveLabels: React.FC<RemainingLeaveLabelProps> = ({ onLabelClick }) => {
  const [loading, setLoading] = useState(true);
  const [personalLeave, setPersonalLeave] = useState<RemainingLeaveData | null>(null);
  const [sickLeave, setSickLeave] = useState<RemainingLeaveData | null>(null);
  const [specialLeave, setSpecialLeave] = useState<RemainingLeaveData | null>(null);
  const [hireDate, setHireDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchRemainingLeave();
  }, []);

  // Calculate total special leave days based on tenure
  const calculateSpecialLeaveDays = (hireDate: Date): number => {
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

      // Calculate personal leave
      const personalLeaves = personalLeaveResponse.data.data;
      const personalUsedMinutes = personalLeaves.reduce((total, leave) => {
        const hours = parseInt(leave.hour) || 0;
        const minutes = parseInt(leave.minutes) || 0;
        return total + (hours * 60) + minutes;
      }, 0);
      const personalUsedHours = personalUsedMinutes / 60;
      const personalTotalHours = 14 * 8; // 14 days * 8 hours
      const personalRemainingHours = personalTotalHours - personalUsedHours;
      const personalRemainingDays = Math.max(0, personalRemainingHours / 8);

      setPersonalLeave({
        type: '事假',
        displayName: '事假',
        totalHours: personalTotalHours,
        usedHours: personalUsedHours,
        remainingDays: personalRemainingDays,
        leaves: personalLeaves
      });

      // Calculate sick leave
      const sickLeaves = sickLeaveResponse.data.data;
      const sickUsedMinutes = sickLeaves.reduce((total, leave) => {
        const hours = parseInt(leave.hour) || 0;
        const minutes = parseInt(leave.minutes) || 0;
        return total + (hours * 60) + minutes;
      }, 0);
      const sickUsedHours = sickUsedMinutes / 60;
      const sickTotalHours = 30 * 8; // 30 days * 8 hours
      const sickRemainingHours = sickTotalHours - sickUsedHours;
      const sickRemainingDays = Math.max(0, sickRemainingHours / 8);

      setSickLeave({
        type: '普通傷病假',
        displayName: '病假',
        totalHours: sickTotalHours,
        usedHours: sickUsedHours,
        remainingDays: sickRemainingDays,
        leaves: sickLeaves
      });

      // Calculate special leave
      const specialLeaves = specialLeaveResponse.data.data;
      const specialUsedMinutes = specialLeaves.reduce((total, leave) => {
        const hours = parseInt(leave.hour) || 0;
        const minutes = parseInt(leave.minutes) || 0;
        return total + (hours * 60) + minutes;
      }, 0);
      const specialUsedHours = specialUsedMinutes / 60;

      // Calculate total special leave based on hire date
      let specialTotalDays = 0;
      if (employeeHireDate) {
        specialTotalDays = calculateSpecialLeaveDays(new Date(employeeHireDate));
      }

      const specialTotalHours = specialTotalDays * 8;
      const specialRemainingHours = specialTotalHours - specialUsedHours;
      const specialRemainingDays = Math.max(0, specialRemainingHours / 8);

      setSpecialLeave({
        type: '特別休假',
        displayName: '特休',
        totalHours: specialTotalHours,
        usedHours: specialUsedHours,
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
      <Typography variant="subtitle1" fontWeight="bold">
        剩餘假別
      </Typography>
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
