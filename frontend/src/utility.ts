// version 0.0.8
// by Randy Lin
// 2025/12/17

/**
 * need to install these depandancy
 * 
 * npm install dayjs
 */

import dayjs from 'dayjs';
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";
import minMax from 'dayjs/plugin/minMax'

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(minMax);

/**
 * Checks if a given date falls on a weekend (Saturday or Sunday) in Taiwan.
 *
 * @param {string | Date | number | dayjs.Dayjs} date - The date to check. Can be a string, Date object, timestamp, or Dayjs object.
 * @returns {boolean} Returns `true` if the date is a Saturday or Sunday, otherwise `false`.
 *
 * @example
 * isWeekend("2025-10-18"); // true (Saturday)
 * isWeekend(new Date("2025-10-19")); // true (Sunday)
 * isWeekend(dayjs("2025-10-20")); // false (Monday)
 */
export function isWeekend(date: string | Date | number | dayjs.Dayjs): boolean {
  const day = dayjs(date).locale("zh-tw").day();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}


/**
 * 
 * @param dateStr ex: 2025-08-10T07:42:00.000Z
 * @returns 
 */
export function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  return dayjs(dateStr).isSame(dayjs(), 'day');
}

/**
 * 
 * @param date ex: 2025-08-10T07:42:00.000Z
 * @returns 2025/08/10 15:42
 */
export function toTaipeiString(date?: string): string {
  if (!date) return dayjs().locale("tw").format('YYYY/MM/DD HH:mm')
  return dayjs(date).locale("tw").format('YYYY/MM/DD HH:mm')
}

/**
 * 
 * @param date ex: 2025-08-10T07:42:00.000Z
 * @returns 2025/08/10
 */
export function toTaipeiDate(date?: any): string {
  if (!date) return dayjs().locale("tw").format('YYYY/MM/DD')
  return dayjs(date).locale("tw").format('YYYY/MM/DD')
}

/**
 * 
 * @param date ex: 2025-08-10T07:42:00.000Z
 */
export function toDayjs(date?: string): dayjs.Dayjs {
  if (!date) return dayjs().tz("Asia/Taipei")
  return dayjs(date).tz("Asia/Taipei")
}

export interface DateObjectQ {
  YY: string;
  YYYY: string;
  MM: string;
  M: string;
  DD: string;
  D: string;
  HH: string;
  H: string;
  hh: string;
  h: string;
  mm: string;
  m: string;
  ss: string;
  s: string;
}

/**
 * Converts an ISO date string to a structured DateObjectQ in a specified time zone.
 *
 * @param date ISO date string (e.g. "2025-08-10T07:42:00.000Z")
 * @param timeZone Optional timezone string, default is "tw" (treated as "Asia/Taipei")
 * @returns DateObjectQ with various formatted date parts
 */
export function toSeparatVariable(date?: string, timeZone: string = "tw"): DateObjectQ {
  const tz = timeZone === "tw" ? "Asia/Taipei" : timeZone;
  const d = dayjs(date).tz(tz);

  return {
    YY: d.format("YY"),
    YYYY: d.format("YYYY"),
    MM: d.format("MM"),
    M: d.format("M"),
    DD: d.format("DD"),
    D: d.format("D"),
    HH: d.format("HH"),   // 24-hour padded
    H: d.format("H"),     // 24-hour non-padded
    hh: d.format("hh"),   // 12-hour padded
    h: d.format("h"),     // 12-hour non-padded
    mm: d.format("mm"),
    m: d.format("m"),
    ss: d.format("ss"),
    s: d.format("s"),
  };
}

/**
 * Converts an error object to a string with an optional prefix.
 *
 * @param {any} error - The error object or message.
 * @param {string} [prefix=''] - The optional prefix to prepend to the error message.
 * @returns {string} - The error message as a string.
 */
export const errorToString = (error: any, prefix: string = ''): string => {
  let res = prefix ? prefix + " " : '';
  if (error instanceof Error) return (res += error.message);
  if (typeof error === 'string') return (res += error);

  return (res += 'Internal Server Error.');
};

/**
 * Fuzzy search function for attendance records.
 * Searches across cardID, empID, employeeName, and department fields.
 * Multiple keywords are separated by spaces and ALL must match (AND logic).
 * Each keyword must match at least one of the searchable fields.
 *
 * @param {object} record - The attendance record to search
 * @param {string} searchQuery - The search query with space-separated keywords
 * @param {string} empID - The employee ID to search in
 * @returns {boolean} - True if all keywords match, false otherwise
 *
 * @example
 * fuzzySearchAttendance(record, "林 1263", "A540")
 * // Returns true if record contains "林" AND "1263" in any searchable field
 */
export const fuzzySearchAttendance = (
  record: {
    cardID?: string;
    employeeName?: string;
    department?: string;
  },
  searchQuery: string,
  empID: string
): boolean => {
  if (!searchQuery || searchQuery.trim() === '') {
    return true; // No filter, show all
  }

  // Split search query by spaces and filter out empty strings
  const keywords = searchQuery.trim().toLowerCase().split(/\s+/).filter(k => k.length > 0);

  if (keywords.length === 0) {
    return true;
  }

  // Get searchable fields
  const cardID = (record.cardID || '').toLowerCase();
  const employeeName = (record.employeeName || '').toLowerCase();
  const department = (record.department || '').toLowerCase();
  const employeeID = empID.toLowerCase();

  // All keywords must match (AND logic)
  return keywords.every(keyword => {
    // Each keyword must match at least one field
    return (
      cardID.includes(keyword) ||
      employeeID.includes(keyword) ||
      employeeName.includes(keyword) ||
      department.includes(keyword)
    );
  });
};

/**
 * Fuzzy search function for approval lists (leave, postclock, business trip).
 * Searches across sequenceNumber, name, and department fields.
 * Multiple keywords are separated by spaces and ALL must match (AND logic).
 * Each keyword must match at least one of the searchable fields.
 *
 * @param {object} record - The approval record to search
 * @param {string} searchQuery - The search query with space-separated keywords
 * @returns {boolean} - True if all keywords match, false otherwise
 *
 * @example
 * fuzzySearchApproval({ sequenceNumber: 123, name: "林承慶", department: "研發課" }, "林 研發")
 * // Returns true if record contains "林" AND "研發" in any searchable field
 */
export const fuzzySearchApproval = (
  record: {
    sequenceNumber?: number;
    name?: string;
    department?: string;
  },
  searchQuery: string
): boolean => {
  if (!searchQuery || searchQuery.trim() === '') {
    return true; // No filter, show all
  }

  // Split search query by spaces and filter out empty strings
  const keywords = searchQuery.trim().toLowerCase().split(/\s+/).filter(k => k.length > 0);

  if (keywords.length === 0) {
    return true;
  }

  // Get searchable fields
  const sequenceNumber = (record.sequenceNumber?.toString() || '').toLowerCase();
  const name = (record.name || '').toLowerCase();
  const department = (record.department || '').toLowerCase();

  // All keywords must match (AND logic)
  return keywords.every(keyword => {
    // Each keyword must match at least one field
    return (
      sequenceNumber.includes(keyword) ||
      name.includes(keyword) ||
      department.includes(keyword)
    );
  });
};