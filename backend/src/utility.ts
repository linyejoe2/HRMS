// version 0.0.3
// by Randy Lin
// 2025/09/26

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

export function calcWarkingDurent(
  from: string,
  to: string
): {
  durent: number;
  crossBreaktime: number;
  crossNight: number;
  crossholiday: number;
} {
  const start = dayjs(from).tz("Asia/Taipei");
  const end = dayjs(to).tz("Asia/Taipei");

  if (!start.isValid() || !end.isValid()) {
    throw new Error("Invalid date format");
  }
  if (end.isBefore(start)) {
    return { durent: 0, crossBreaktime: 0, crossNight: 0, crossholiday: 0 };
  }

  let durent = 0;
  let crossBreaktime = 0;
  let crossNight = 0;
  let crossholiday = 0;

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
      crossholiday += 24 * 60;
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
        durent += overlapEnd.diff(overlapStart, "minute");
      }
    }

    // 判斷跨日 → 每天有 15 小時不算工時
    if (end.isAfter(cursor.endOf("day"))) {
      crossNight += 15 * 60;
    }

    cursor = cursor.add(1, "day");

    // 判斷是否跨過午休 12:00–13:00
    const lunchStart = start.hour(12).minute(0).second(0).millisecond(0);
    const lunchEnd = start.hour(13).minute(0).second(0).millisecond(0);
    if (start.isBefore(lunchEnd) && end.isAfter(lunchStart)) {
      crossBreaktime = 60;
    }
  }

  return { durent, crossBreaktime, crossNight, crossholiday };
}
