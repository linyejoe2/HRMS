// components/StatusChip.tsx
import React, { ReactElement, useState } from 'react';
import { Chip } from '@mui/material';
import { isToday } from '@/utils/util/utility';
import LeaveDetailsModal from '../Leave/LeaveDetailsModal';
import { AttendanceLog, calcAttendanceStatuses } from '@/utils/attendanceUtils';

interface StatusChipProps {
  log: AttendanceLog
}

const StatusChip: React.FC<StatusChipProps> = ({ log }) => {
  const [modalOpen, setModalOpen] = useState(false);

  const {
    isHoliday,
    hasLeaveStatus,
    hasLeaveRecords,
    isLate,
    isEarlyLeave,
    isAbsent,
    hasNoClockTimes,
  } = calcAttendanceStatuses(log);

  const chips: ReactElement[] = [<Chip
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
  if (isHoliday) {
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
    if (isToday(log.date)) chips.push(<span key="today">(今天)</span>)
    return <>{chips}</>;
  }

  // Priority 2: Check for leave status or leave records
  if (hasLeaveStatus || hasLeaveRecords) {
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

    if (isToday(log.date)) chips.push(<span key="today">(今天)</span>)
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

  // Priority 3: Render based on calculated attendance status
  if (isAbsent) {
    chips.push(<Chip key="absent" sx={{ mr: 1 }} label="缺勤" color="error" size="small" />)
  } else {
    if (isLate) chips.push(<Chip key="late" sx={{ mr: 1 }} label="遲到" color="warning" size="small" />)
    if (isEarlyLeave) chips.push(<Chip key="earlyLeave" sx={{ mr: 1 }} label="早退" color="warning" size="small" />)

    if (!isLate && !isEarlyLeave && !hasNoClockTimes) {
      chips.push(<Chip key="normal" sx={{ mr: 1 }} label="正常" color="success" size="small" />)
    }
  }
  if (isToday(log.date)) chips.push(<span key="today">(今天)</span>)

  return <>{chips}</>;
};

export default StatusChip;
