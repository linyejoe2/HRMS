import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

// === 設定檔 ===
const CONFIG = {
  TZ: "Asia/Taipei",
  WORK_START: { h: 8, m: 30 },
  LUNCH_START: { h: 12, m: 0 },
  LUNCH_END: { h: 13, m: 0 },
  WORK_END: { h: 17, m: 30 },
  // 定義標準化時數 (分鐘)
  STD_HALF_DAY_MINS: 4 * 60, // 4小時 = 240分
  REAL_MORNING_MINS: 3.5 * 60, // 實際上午長度 210分
  REAL_AFTERNOON_MINS: 4.5 * 60, // 實際下午長度 270分
};

interface WorkingDurationResult {
  minuteFormat: number;
  hourFormat: number;
  crossBreaktime: number;
  crossNight: number;
  crossHoliday: number;
}

interface CalcOptions {
  holidays?: string[]; // 國定假日列表
  useStandard4HourBlocks?: boolean; // 是否啟用「上下午皆為4小時」的設定
}

/**
 * 主函式：計算請假期間的工作時數
 */
export function calcWorkingDuration(
  from: string,
  to: string,
  options: CalcOptions = {}
): WorkingDurationResult {
  const { holidays = [], useStandard4HourBlocks = false } = options;

  const output: WorkingDurationResult = {
    minuteFormat: 0,
    hourFormat: 0,
    crossBreaktime: 0,
    crossNight: 0,
    crossHoliday: 0,
  };

  const start = dayjs(from).tz(CONFIG.TZ);
  const end = dayjs(to).tz(CONFIG.TZ);

  if (!start.isValid() || !end.isValid()) throw new Error("Invalid date format");
  if (end.isBefore(start)) return output;

  const holidaySet = new Set(holidays);
  let cursor = start.startOf("day");
  const finalDay = end.endOf("day");

  while (cursor.isBefore(finalDay) || cursor.isSame(finalDay, "day")) {
    const currentDayStart = cursor.isSame(start, "day") ? start : cursor.startOf("day");
    const currentDayEnd = cursor.isSame(end, "day") ? end : cursor.endOf("day");

    // 若結束時間早於開始時間 (如隔日 00:00)，跳過
    if (currentDayEnd.isBefore(currentDayStart)) {
      cursor = cursor.add(1, "day");
      continue;
    }

    const currentDayStr = cursor.format("YYYY-MM-DD");
    const dayOfWeek = cursor.day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isNationalHoliday = holidaySet.has(currentDayStr);
    const dayDiffMinutes = currentDayEnd.diff(currentDayStart, "minute");

    if (isWeekend || isNationalHoliday) {
      output.crossHoliday += dayDiffMinutes;
    } else {
      // === 核心修改：呼叫獨立計算函式 ===
      const dailyResult = calculateDailyWorkMinutes(
        cursor, 
        currentDayStart, 
        currentDayEnd, 
        useStandard4HourBlocks
      );

      output.minuteFormat += dailyResult.workMinutes;
      output.crossBreaktime += dailyResult.breakMinutes;
      
      // 計算 CrossNight: 總歷時 - (工時 + 午休)
      // 注意：如果是標準化模式，工時是被轉換過的，這裡計算 CrossNight 建議用「物理時間」反推，
      // 但通常 CrossNight 只是參考用，這裡維持「物理時間」邏輯以確保數據守恆。
      const physicalWorkMinutes = calculateDailyWorkMinutes(cursor, currentDayStart, currentDayEnd, false).workMinutes;
      output.crossNight += (dayDiffMinutes - physicalWorkMinutes - dailyResult.breakMinutes);
    }

    cursor = cursor.add(1, "day");
  }

  output.hourFormat = Number((output.minuteFormat / 60).toFixed(2));
  return output;
}

/**
 * 獨立函式：計算「單日」內的有效工時與午休
 * 包含「上下午皆算 4 小時」的特殊邏輯
 */
function calculateDailyWorkMinutes(
  cursorDay: Dayjs, 
  start: Dayjs, 
  end: Dayjs, 
  useStandard4HourBlocks: boolean
) {
  // 定義當天的四個關鍵時間點
  const workStart = cursorDay.hour(CONFIG.WORK_START.h).minute(CONFIG.WORK_START.m).second(0);
  const lunchStart = cursorDay.hour(CONFIG.LUNCH_START.h).minute(CONFIG.LUNCH_START.m).second(0);
  const lunchEnd = cursorDay.hour(CONFIG.LUNCH_END.h).minute(CONFIG.LUNCH_END.m).second(0);
  const workEnd = cursorDay.hour(CONFIG.WORK_END.h).minute(CONFIG.WORK_END.m).second(0);

  // 計算物理交集時間
  const morningOverlap = getOverlapMinutes(start, end, workStart, lunchStart);
  const afternoonOverlap = getOverlapMinutes(start, end, lunchEnd, workEnd);
  const breakOverlap = getOverlapMinutes(start, end, lunchStart, lunchEnd);

  let totalWorkMinutes = 0;

  if (useStandard4HourBlocks) {
    // === 特殊模式：加權計算 ===
    // 公式：(實際請假分鐘 / 該時段總長度) * 4小時(240分)
    
    // 上午權重轉換
    if (morningOverlap > 0) {
      const weightedMorning = (morningOverlap / CONFIG.REAL_MORNING_MINS) * CONFIG.STD_HALF_DAY_MINS;
      totalWorkMinutes += weightedMorning;
    }
    
    // 下午權重轉換
    if (afternoonOverlap > 0) {
      const weightedAfternoon = (afternoonOverlap / CONFIG.REAL_AFTERNOON_MINS) * CONFIG.STD_HALF_DAY_MINS;
      totalWorkMinutes += weightedAfternoon;
    }
    
    // 四捨五入避免小數點誤差 (例如 3.999999 -> 4)
    totalWorkMinutes = Math.round(totalWorkMinutes);
    
  } else {
    // === 一般模式：物理時間 ===
    totalWorkMinutes = morningOverlap + afternoonOverlap;
  }

  return {
    workMinutes: totalWorkMinutes,
    breakMinutes: breakOverlap
  };
}

// 輔助函式：計算交集 (不變)
function getOverlapMinutes(startA: Dayjs, endA: Dayjs, startB: Dayjs, endB: Dayjs): number {
  const maxStart = startA.isAfter(startB) ? startA : startB;
  const minEnd = endA.isBefore(endB) ? endA : endB;
  if (maxStart.isBefore(minEnd)) {
    return minEnd.diff(maxStart, "minute");
  }
  return 0;
}