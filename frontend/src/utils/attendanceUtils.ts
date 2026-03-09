import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { isToday as calcToday, toTaipeiDate } from "./util/utility";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface AttendanceLog {
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

export interface AttendanceStatus {
  statuses: string[];
  isLate: Boolean;
  isEarlyLeave: Boolean;
  hasNoClockTimes: Boolean;
  hasNoLeaveOrStatus: Boolean;
  isToday: Boolean;
  isHoliday: Boolean;
  hasLeaveStatus: Boolean;
  hasLeaveRecords: Boolean;
  isAbsent: Boolean;
}

export const calcAttendanceStatuses = (log: AttendanceLog): AttendanceStatus => {
  const statuses: string[] = []
  const hasNoClockTimes = !log.clockInTime || !log.clockOutTime;
  const hasNoLeaveOrStatus = !log.status && (!log.leaves || log.leaves.length === 0);
  const isHoliday = !!log.holidayName;
  let isLate = false;
  let isEarlyLeave = false;
  let isToday = calcToday(log.date);
  const hasLeaveStatus = !!(log.status && !log.clockInTime && !log.clockOutTime);
  const hasLeaveRecords = !!(log.leaves && log.leaves.length > 0);

  if (isHoliday && !log.status) statuses.push(log.holidayName!)
  if (hasLeaveStatus) statuses.push(log.status!)

  if (log.clockInTime && log.clockOutTime) {
    const inTimeDayjs = dayjs(log.clockInTime).tz('Asia/Taipei');
    const outTimeDayjs = dayjs(log.clockOutTime).tz('Asia/Taipei');

    const standardStart = inTimeDayjs.clone().hour(8).minute(30).second(0);
    const standardEnd = inTimeDayjs.clone().hour(17).minute(20).second(0);
    const lunchStart = inTimeDayjs.clone().hour(12).minute(0).second(0);
    const lunchEnd = inTimeDayjs.clone().hour(13).minute(0).second(0);
    const flexibleStart = inTimeDayjs.clone().hour(9).minute(30).second(0);

    isLate = inTimeDayjs.isAfter(standardStart);
    isEarlyLeave = outTimeDayjs.isBefore(standardEnd);

    const pastLunchBreak = inTimeDayjs.isBefore(lunchStart) && outTimeDayjs.isAfter(lunchEnd);
    let duration = outTimeDayjs.diff(inTimeDayjs, 'minute');
    if (pastLunchBreak) duration -= 60;

    if (duration >= 470 && inTimeDayjs.isBefore(flexibleStart)) isLate = false;
  } else if (log.clockInTime) {
    const inTimeDayjs = dayjs(log.clockInTime).tz('Asia/Taipei');
    const standardStart = inTimeDayjs.clone().hour(8).minute(30).second(0);
    isLate = inTimeDayjs.isAfter(standardStart);
  } else if (log.clockOutTime) {
    const outTimeDayjs = dayjs(log.clockOutTime).tz('Asia/Taipei');
    const standardEnd = outTimeDayjs.clone().hour(17).minute(20).second(0);
    isEarlyLeave = outTimeDayjs.isBefore(standardEnd);
  }

  const isAbsent = hasNoClockTimes && hasNoLeaveOrStatus && dayjs(log.date).isBefore(toTaipeiDate());

  return {
    statuses,
    hasNoClockTimes,
    hasNoLeaveOrStatus,
    isLate,
    isEarlyLeave,
    isToday,
    isHoliday,
    hasLeaveStatus,
    hasLeaveRecords,
    isAbsent,
  }
}