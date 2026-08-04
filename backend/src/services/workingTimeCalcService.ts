import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";
import { getOverlapMinutes, isWorkingDay } from "../util/utility";
import { CalcOptions, DailyResult, WorkingDurationResult, WorkingSchedule, WorkingTimeMode } from "../types";
import { CONST } from "../constants";
import { holidayService } from "./holidayService";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

function createSchedule(day: Dayjs): WorkingSchedule {
  const p = (h: number, m: number) => day.hour(h).minute(m).second(0).millisecond(0);
  return {
    workStart: p(CONST.workingTime.workStart.hour, CONST.workingTime.workStart.minute),
    lunchStart: p(CONST.workingTime.lunchStart.hour, CONST.workingTime.lunchStart.minute),
    lunchEnd: p(CONST.workingTime.lunchEnd.hour, CONST.workingTime.lunchEnd.minute),
    workEnd: p(CONST.workingTime.workEnd.hour, CONST.workingTime.workEnd.minute)
  };
}

// 2. 核心：計算實際物理工時
function calculatePhysicalTime(
  s: WorkingSchedule,
  start: Dayjs,
  end: Dayjs
): DailyResult {
  const morning = getOverlapMinutes(start, end, s.workStart, s.lunchStart);
  const afternoon = getOverlapMinutes(start, end, s.lunchEnd, s.workEnd);
  const breakMins = getOverlapMinutes(start, end, s.lunchStart, s.lunchEnd);
  const physicalTotal = morning + afternoon;

  return {
    morningPhysicalMins: morning,
    afternoonPhysicalMins: afternoon,
    workingMinutes: physicalTotal,
    physicalWorkingMinutes: physicalTotal,
    breakMinutes: breakMins,
  };
}

// 3. 標準化折算邏輯 (將物理工時依上下午比例換算)
function standardizeWorkingMinutes(morningMins: number, afternoonMins: number): number {
  // 上午按 210 -> 240 折算
  const stdMorning = (morningMins / CONST.workingTime.morningMinutes) * CONST.workingTime.standardHalfDayMinutes;
  // 下午按 270 -> 240 折算
  const stdAfternoon = (afternoonMins / CONST.workingTime.afternoonMinutes) * CONST.workingTime.standardHalfDayMinutes;

  return Math.round(stdMorning + stdAfternoon);
}

// 4. 對外統一入口
export function calculateDaily(day: Dayjs, start: Dayjs, end: Dayjs, mode: WorkingTimeMode): DailyResult {
  const schedule = createSchedule(day);
  const result = calculatePhysicalTime(schedule, start, end);

  if (mode === WorkingTimeMode.Standardized) {
    result.workingMinutes = standardizeWorkingMinutes(
      result.morningPhysicalMins,
      result.afternoonPhysicalMins
    );
  }

  return result;
}

/**
 * 主函式：計算請假期間的工作時數
 */
export function calcWorkingDuration(start: Dayjs, end: Dayjs, opt: CalcOptions): WorkingDurationResult {
  const out = { workingMinutes: 0, breakMinutes: 0, outsideWorkingMinutes: 0, holidayMinutes: 0 };

  if (!start.isValid() || !end.isValid()) throw Error("Invalid"); if (end.isBefore(start)) return out;

  const hs = new Set(opt.holidays ?? []);
  for (let d = start.startOf("day"); d.isBefore(end.endOf("day")) || d.isSame(end, "day"); d = d.add(1, "day")) {
    const ds = d.isSame(start, "day") ? start : d.startOf("day");
    const de = d.isSame(end, "day") ? end : d.endOf("day");
    const diff = de.diff(ds, "minute");
    if (!isWorkingDay(d, hs)) { out.holidayMinutes += diff; continue; }
    const daily = calculateDaily(d, ds, de, opt.mode ?? WorkingTimeMode.Physical);
    out.workingMinutes += daily.workingMinutes;
    out.breakMinutes += daily.breakMinutes;
    out.outsideWorkingMinutes += diff - daily.physicalWorkingMinutes - daily.breakMinutes;
  }
  return out;
}

/**
 * help function
 * make calcWorkingDuration() more clean
 **/
export async function calcWorkingDurationHelper(start: Dayjs, end: Dayjs): Promise<WorkingDurationResult> {
  const holidays = await holidayService.getHolidaysStringByDateRange(start, end)
  return calcWorkingDuration(start, end, { holidays, mode: WorkingTimeMode.Standardized })
}