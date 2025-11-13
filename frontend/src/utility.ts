// version 0.0.7
// by Randy Lin
// 2025/11/13

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
 * @returns 2025/08/10 15:42
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

export function calcWorkingDurent(
  from: string,
  to: string
): {
  minuteFormat: number;
  hourFormat: number
  crossBreaktime: number;
  crossNight: number;
  crossholiday: number;
} {
  let output = {
    minuteFormat: 0,
    hourFormat: 0,
    crossBreaktime: 0,
    crossNight: 0,
    crossholiday: 0
  }
  const start = dayjs(from).tz("Asia/Taipei");
  const end = dayjs(to).tz("Asia/Taipei");

  if (!start.isValid() || !end.isValid()) {
    throw new Error("Invalid date format");
  }
  if (end.isBefore(start)) {
    return output;
  }



  // 定義每天的工作時段
  const WORK_PERIODS: [string, string][] = [
    ["08:30", "12:00"],
    ["13:00", "17:30"],
  ];

  // 遍歷每一天
  let cursor = start.startOf("day");
  while (cursor.isBefore(end)) {
    const dayOfWeek = cursor.day(); // 0=Sun, 6=Sat

    // 處理週末
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      output.crossholiday += 24 * 60;
      cursor = cursor.add(1, "day");
      continue;
    }

    // 處理工作區間
    for (const [startStr, endStr] of WORK_PERIODS) {
      const [sh, sm] = startStr.split(":").map(Number);
      const [eh, em] = endStr.split(":").map(Number);

      const periodStart = cursor.hour(sh).minute(sm).second(0).millisecond(0);
      const periodEnd = cursor.hour(eh).minute(em).second(0).millisecond(0);

      const overlapStart = dayjs.max(start, periodStart);
      const overlapEnd = dayjs.min(end, periodEnd);

      if (overlapEnd.isAfter(overlapStart)) {
        output.minuteFormat += overlapEnd.diff(overlapStart, "minute");
      }
    }

    // 判斷跨日 → 每天有 15 小時不算工時
    if (end.isAfter(cursor.endOf("day"))) {
      output.crossNight += 15 * 60;
    }

    cursor = cursor.add(1, "day");

    // 判斷是否跨過午休 12:00–13:00
    const lunchStart = start.hour(12).minute(0).second(0).millisecond(0);
    const lunchEnd = start.hour(13).minute(0).second(0).millisecond(0);
    if (start.isBefore(lunchEnd) && end.isAfter(lunchStart)) {
      output.crossBreaktime = 60;
    }
  }

  // 👉 若結束時間正好是 17:20，補 10 分鐘
  if (end.format("HH:mm") === "17:20") {
    output.minuteFormat += 10;
  }

  output.hourFormat = Math.round(output.minuteFormat / 60)

  return output;
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