// components/StatusChip.tsx
import React, { ReactElement, useState } from 'react';
import { Chip } from '@mui/material';
import { isToday } from '@/utility';
import LeaveDetailsModal from './LeaveDetailsModal';

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
  }
}

const StatusChip: React.FC<StatusChipProps> = ({log}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const chips : ReactElement[] = []

  // Add leave chip if there are leave records
  if (log.leaves && log.leaves.length > 0) {
    chips.push(
      <Chip
        key="leave"
        sx={{mr:1, cursor: 'pointer'}}
        label={`請假${log.leaves.length > 1 ? ` (${log.leaves.length})` : ''}`}
        color="primary"
        size="small"
        onClick={() => setModalOpen(true)}
      />
    );
  }

  if (log.isAbsent) chips.push(<Chip key="absent" sx={{mr:1}} label="缺勤" color="error" size="small" />)
  else {
    if (log.isLate) chips.push(<Chip key="late" sx={{mr:1}} label="遲到" color="warning" size="small" />)
    if (log.isEarlyLeave) chips.push(<Chip key="earlyLeave" sx={{mr:1}} label="早退" color="warning" size="small" />)
    if (!log.isLate && !log.isEarlyLeave && (!log.leaves || log.leaves.length === 0)) {
      chips.push(<Chip key="normal" sx={{mr:1}} label="正常" color="success" size="small" />)
    }
  }

  if (isToday(log.clockInTime)) chips.push(<span key="today">(今天)</span>)

  return <>
    { chips }
    {log.leaves && log.leaves.length > 0 && (
      <LeaveDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        leaveSequenceNumbers={log.leaves}
        attendanceDate={new Date(log.date).toLocaleDateString('zh-TW')}
      />
    )}
  </>;
};

export default StatusChip;
