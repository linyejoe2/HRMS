// components/StatusChip.tsx
import React, { ReactElement, useState } from 'react';
import { Chip } from '@mui/material';
import { isToday } from '@/utility';
import LeaveDetailsModal from '../Leave/LeaveDetailsModal';

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
    isLate?: boolean; // Is late for work
    isEarlyLeave?: boolean;
    isAbsent?: boolean; // Is absent

    // Leave tracking
    leaves?: number[]; // Array of leave sequenceNumbers

    // Status and holiday fields from AttendanceTab
    status?: string; // Can be leave type, holiday name, or other status
    holidayName?: string; // Holiday name if date is a holiday
  }
}

const StatusChip: React.FC<StatusChipProps> = ({log}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const chips : ReactElement[] = []

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

  // Priority 4: Check absence, late, early leave
  // Check for absence: no clock in/out times and no leave
  const hasNoClockTimes = !log.clockInTime && !log.clockOutTime;
  const hasNoLeaveOrStatus = !log.status && (!log.leaves || log.leaves.length === 0);

  if (log.isAbsent || (hasNoClockTimes && hasNoLeaveOrStatus)) {
    chips.push(<Chip key="absent" sx={{mr:1}} label="缺勤" color="error" size="small" />)
  } else {
    if (log.isLate) chips.push(<Chip key="late" sx={{mr:1}} label="遲到" color="warning" size="small" />)
    if (log.isEarlyLeave) chips.push(<Chip key="earlyLeave" sx={{mr:1}} label="早退" color="warning" size="small" />)

    // Only show "正常" if there are actual clock times or if none of the other conditions apply
    if (!log.isLate && !log.isEarlyLeave && (!log.leaves || log.leaves.length === 0) && (log.clockInTime || log.clockOutTime)) {
      chips.push(<Chip key="normal" sx={{mr:1}} label="正常" color="success" size="small" />)
    }
  }

  if (isToday(log.clockInTime)) chips.push(<span key="today">(今天)</span>)

  return <>{chips}</>;
};

export default StatusChip;
