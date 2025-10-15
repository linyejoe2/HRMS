// components/StatusChip.tsx
import React, { ReactElement } from 'react';
import { Chip } from '@mui/material';
import { isToday } from '@/utility';

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
  }
}

const StatusChip: React.FC<StatusChipProps> = ({log}) => {
    // <Chip sx={{mr:1, display: 'none'}} label="請假" color="primary" size="small" />
    // <Chip sx={{mr:1, display: 'none'}} label="公差" color="secondary" size="small" />

  const chips : ReactElement[] = []
  if (log.isAbsent) chips.push(<Chip sx={{mr:1}} label="缺勤" color="error" size="small" />)
  else {
    if (log.isLate) chips.push(<Chip sx={{mr:1}} label="遲到" color="warning" size="small" />)
    if (log.isEarlyLeave) chips.push(<Chip sx={{mr:1}} label="早退" color="warning" size="small" />)
    if (!log.isLate && !log.isEarlyLeave) chips.push(<Chip sx={{mr:1}} label="正常" color="success" size="small" />)
  }

  if (isToday(log.clockInTime)) chips.push(<>(今天)</>)

  return <>
    { chips }
  </>;
};

export default StatusChip;
