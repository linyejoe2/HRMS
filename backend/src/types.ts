import { Dayjs } from "dayjs";

// #region working calc module
export enum WorkingTimeMode { Physical, Standardized }

export interface CalcOptions {
  holidays?: string[]; // 假日列表
  mode?: WorkingTimeMode; // 按照正確時間計算或是按照上下各半天計算
}

export interface WorkingDurationResult {
  workingMinutes: number;
  breakMinutes: number;
  outsideWorkingMinutes: number;
  holidayMinutes: number;
}

export interface DailyResult {
  morningPhysicalMins: number,
  afternoonPhysicalMins: number,
  workingMinutes: number;
  physicalWorkingMinutes: number;
  breakMinutes: number;
}

export interface WorkingSchedule {
  workStart: Dayjs; lunchStart: Dayjs; lunchEnd: Dayjs; workEnd: Dayjs;
}
// #endregion