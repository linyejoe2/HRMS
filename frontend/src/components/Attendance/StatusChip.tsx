// components/StatusChip.tsx
import React, { ReactElement, useState } from 'react';
import { Chip } from '@mui/material';
import { isToday } from '@/utility';
import LeaveDetailsModal from '../Leave/LeaveDetailsModal';
import dayjs from 'dayjs';
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";
import minMax from 'dayjs/plugin/minMax'

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(minMax);

interface StatusChipProps {
  log: {
    empID: string; // Mapped employee ID (A029, etc.)
    cardID?: string; // 8-digit employee ID from access system
    employeeName?: string; // Employee name from Employee collection
    department?: string; // Department from Employee collection
    date: string; // Attendance string (YYYY-MM-DD)
    clockInRawRecord?: string; // Original raw data for debugging
    clockInTime?: string; // Clock in time
    clockInStatus?: string; // Clock in status (D000=in, D900=out)
    clockOutRawRecord?: string; // Original raw data for debugging
    clockOutTime?: string; // Clock out time
    clockOutStatus?: string; // Clock out status

    // Calculated fields
    workDuration?: number; // Total work hours

    // Leave tracking
    leaves?: number[]; // Array of leave sequenceNumbers

    // Status and holiday fields from AttendanceTab
    status?: string; // Can be leave type, holiday name, or other status
    holidayName?: string; // Holiday name if date is a holiday
  }
}

const StatusChip: React.FC<StatusChipProps> = ({log}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const chips : ReactElement[] = [<Chip
        key="holiday"
        sx={{
          display: "none",
          mr: 1,
          backgroundColor: '#f44336',
          color: 'white',
          '&:hover': {
            backgroundColor: '#d32f2f'
          }
        }}
        label={JSON.stringify(log)}
        size="small"
      />]

  // Priority 1: Check for holidays (from AttendanceTab)
  if (log.holidayName) {
    chips.push(
      <Chip
        key="holiday"
        sx={{
          mr: 1,
          backgroundColor: '#f44336',
          color: 'white',
          '&:hover': {
            backgroundColor: '#d32f2f'
          }
        }}
        label={log.status || log.holidayName}
        size="small"
      />
    );
    if (isToday(log.clockInTime)) chips.push(<span key="today">(今天)</span>)
    return <>{chips}</>;
  }

  // Priority 2: Check for leave status or leave records
  const hasLeaveStatus = log.status && !log.clockInTime && !log.clockOutTime;
  const hasLeaveRecords = log.leaves && log.leaves.length > 0;

  if (hasLeaveStatus || hasLeaveRecords) {
    // Determine label: show leave type if available, otherwise "請假" with count if multiple
    let label = '請假';
    if (log.status) {
      label = log.status;
    }
    if (hasLeaveRecords && log.leaves!.length > 1) {
      label += ` (${log.leaves!.length})`;
    }

    chips.push(
      <Chip
        key="leave"
        sx={{
          mr: 1,
          cursor: hasLeaveRecords ? 'pointer' : 'default'
        }}
        label={label}
        color="primary"
        size="small"
        onClick={hasLeaveRecords ? () => setModalOpen(true) : undefined}
      />
    );

    if (isToday(log.clockInTime)) chips.push(<span key="today">(今天)</span>)
    return <>
      {chips}
      {hasLeaveRecords && (
        <LeaveDetailsModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          leaveSequenceNumbers={log.leaves!}
          attendanceDate={new Date(log.date).toLocaleDateString('zh-TW')}
        />
      )}
    </>;
  }

  // Priority 3: Calculate attendance status based on clock times
  // Using same logic as backend calcWorkDuration()
  const hasNoClockTimes = !log.clockInTime && !log.clockOutTime;
  const hasNoLeaveOrStatus = !log.status && (!log.leaves || log.leaves.length === 0);

  let isLate = false;
  let isEarlyLeave = false;

  if (log.clockInTime && log.clockOutTime) {
    // Both clock times available - use full backend logic
    const inTimeDayjs = dayjs(log.clockInTime).tz('Asia/Taipei');
    const outTimeDayjs = dayjs(log.clockOutTime).tz('Asia/Taipei');

    // Define standard times
    const standardStart = inTimeDayjs.clone().hour(8).minute(30).second(0);
    const standardEnd = inTimeDayjs.clone().hour(17).minute(20).second(0);
    const lunchStart = inTimeDayjs.clone().hour(12).minute(0).second(0);
    const lunchEnd = inTimeDayjs.clone().hour(13).minute(0).second(0);
    const flexibleStart = inTimeDayjs.clone().hour(9).minute(30).second(0);

    // Check if late (after 08:30)
    isLate = inTimeDayjs.isAfter(standardStart);

    // Check if early leave (before 17:20)
    isEarlyLeave = outTimeDayjs.isBefore(standardEnd);

    // Check if past lunch break (in before 12:00 and out after 13:00)
    const pastLunchBreak = inTimeDayjs.isBefore(lunchStart) && outTimeDayjs.isAfter(lunchEnd);

    // Calculate duration in minutes
    let duration = outTimeDayjs.diff(inTimeDayjs, 'minute');

    // Subtract lunch break if applicable
    if (pastLunchBreak) {
      duration -= 60;
    }

    // If duration >= 470 minutes (7h 50m) and in before 09:30, not considered late
    if (duration >= 470 && inTimeDayjs.isBefore(flexibleStart)) {
      isLate = false;
    }
  } else if (log.clockInTime) {
    // Only clock in time - can only check if late
    const inTimeDayjs = dayjs(log.clockInTime).tz('Asia/Taipei');
    const standardStart = inTimeDayjs.clone().hour(8).minute(30).second(0);
    isLate = inTimeDayjs.isAfter(standardStart);
  } else if (log.clockOutTime) {
    // Only clock out time - can only check if early leave
    const outTimeDayjs = dayjs(log.clockOutTime).tz('Asia/Taipei');
    const standardEnd = outTimeDayjs.clone().hour(17).minute(20).second(0);
    isEarlyLeave = outTimeDayjs.isBefore(standardEnd);
  }

  // Check for absence: no clock times and no leave/holiday
  if (hasNoClockTimes && hasNoLeaveOrStatus) {
    chips.push(<Chip key="absent" sx={{mr:1}} label="缺勤" color="error" size="small" />)
  } else {
    if (isLate) chips.push(<Chip key="late" sx={{mr:1}} label="遲到" color="warning" size="small" />)
    if (isEarlyLeave) chips.push(<Chip key="earlyLeave" sx={{mr:1}} label="早退" color="warning" size="small" />)

    // Only show "正常" if there are actual clock times and not late/early
    if (!isLate && !isEarlyLeave && (log.clockInTime || log.clockOutTime)) {
      chips.push(<Chip key="normal" sx={{mr:1}} label="正常" color="success" size="small" />)
    }
  }

  if (isToday(log.clockInTime)) chips.push(<span key="today">(今天)</span>)

  return <>{chips}</>;
};

export default StatusChip;
