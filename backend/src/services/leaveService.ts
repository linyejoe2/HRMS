import { Leave, ILeave, Employee, Attendance, LeaveAdjustment, ILeaveAdjustment, LegacyLeave, IEmployee } from '../models';
import { APIError } from '../middleware/errorHandler';
import { isWeekend, dayjsNum, parseJSONfromFile, dayjsTz, parseChineseDate, errorToString, toDayjs } from '../util/utility';
import { calcWorkingDuration } from './workingTimeCalcService';
import * as XLSX from 'xlsx';
import { promises } from 'dns';
import legacyLeaveJson from "../config/legacyLeave.json"
import dayjs, { Dayjs } from 'dayjs';
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

export type DurentObject = {
  minuteFormat: number;
  hourFormat: number
  crossBreaktime: number;
  crossNight: number;
  crossholiday: number;
}

// Leave types whose total allocation comes entirely from HR-entered adjustments.
export const RESERVATION_LEAVE_TYPES: { type: LeaveType; displayName: string }[] = [
  { type: '婚假', displayName: '婚假' },
  { type: '喪假', displayName: '喪假' },
];

export type LeaveType = "婚假" | "喪假" | '事假' | '普通傷病假' | '特別休假'

export interface LeaveData {
  type: LeaveType; // 婚假 喪假
  displayName: string;
  totalHours: number;
  usedHours: number;
  remainingHours: number;
  leaves: ILeave[];
  adjustments: ILeaveAdjustment[];
}

export interface UserLeaveData {
  personalLeave: LeaveData;
  sickLeave: LeaveData;
  specialLeave: LeaveData;
  reservationLeaves: LeaveData[];
}

// --- private helpers for getUserLeaveBalance ---

function filterActiveAdjustments(adjustments: ILeaveAdjustment[], referenceDate: Date = new Date()): ILeaveAdjustment[] {
  const ref = dayjs(referenceDate);
  return adjustments.filter(adj => {
    if (adj.effectiveDate && ref.isBefore(dayjs(adj.effectiveDate), 'day')) return false;
    if (adj.expiryDate && ref.isAfter(dayjs(adj.expiryDate), 'day')) return false;
    return true;
  });
}

function sumUsedMinutes(leaves: ILeave[]): number {
  return leaves.reduce((total, l) => total + (parseInt(l.hour) * 60) + parseInt(l.minutes), 0);
}

function sumAdjustmentMinutes(adjustments: ILeaveAdjustment[]): number {
  return adjustments.reduce((total, adj) => total + adj.minutes, 0);
}

function minsToHours(minutes: number): number {
  return minutes / 60;
}

function buildStandardLeaveData(
  type: LeaveType,
  displayName: string,
  baseTotalMinutes: number,
  leaves: ILeave[],
  allAdjustments: ILeaveAdjustment[]
): LeaveData {
  // const activeAdj = filterActiveAdjustments(allAdjustments);
  const adjustmentMinutes = sumAdjustmentMinutes(allAdjustments);
  const usedMinutes = sumUsedMinutes(leaves);
  return {
    type,
    displayName,
    totalHours: minsToHours(baseTotalMinutes),
    usedHours: minsToHours(usedMinutes),
    remainingHours: minsToHours(baseTotalMinutes - usedMinutes + adjustmentMinutes),
    leaves,
    adjustments: allAdjustments
  };
}

export class LeaveService {
  static async checkLeaveRequestDidntRepeat(leave: ILeave): Promise<boolean> {
    const leaves = await this.getLeaveRequestsByEmployee(leave.empID);

    const approvedLeaves = leaves.filter(existingLeave =>
      existingLeave.status === 'approved' &&
      existingLeave._id?.toString() !== leave._id?.toString()
    );

    if (approvedLeaves.length === 0) {
      return true;
    }

    const newLeaveStart = new Date(leave.leaveStart);
    const newLeaveEnd = new Date(leave.leaveEnd);

    for (const approvedLeave of approvedLeaves) {
      const existingStart = new Date(approvedLeave.leaveStart);
      const existingEnd = new Date(approvedLeave.leaveEnd);

      const hasOverlap = this.checkDateRangeOverlap(
        newLeaveStart,
        newLeaveEnd,
        existingStart,
        existingEnd
      );

      if (hasOverlap) {
        return false;
      }
    }

    return true;
  }

  private static checkDateRangeOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  static async createLeaveRequest(empID: string, leaveData: {
    leaveType: string;
    reason: string;
    leaveStart: string;
    leaveEnd: string;
    supportingInfo?: string[];
  }): Promise<ILeave> {
    const employee = await Employee.findOne({ empID, isActive: true });
    if (!employee) {
      throw new APIError('Employee not found', 404);
    }

    const leaveStart = toDayjs(leaveData.leaveStart)
    const leaveEnd = toDayjs(leaveData.leaveEnd)

    const timeDiff = calcWorkingDuration(leaveStart, leaveEnd, { useStandard4HourBlocks: true });

    const totalMinutes = Math.floor(timeDiff.minuteFormat);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const createdDate = new Date();
    const YYYY = String(createdDate.getFullYear());
    const mm = String(createdDate.getMonth() + 1).padStart(2, '0');
    const DD = String(createdDate.getDate()).padStart(2, '0');

    const leave = new Leave({
      empID,
      name: employee.name,
      department: employee.department || '',
      leaveType: leaveData.leaveType,
      reason: leaveData.reason,
      leaveStart: leaveStart.toDate(),
      leaveEnd: leaveEnd.toDate(),
      YYYY,
      mm,
      DD,
      hour: String(hours),
      minutes: String(minutes),
      supportingInfo: leaveData.supportingInfo,
      status: 'created'
    });

    const isNotOverlapping = await this.checkLeaveRequestDidntRepeat(leave);
    if (!isNotOverlapping) {
      throw new APIError('請假時間重複!', 409);
    }

    const savedLeave = await leave.save();

    return savedLeave;
  }

  static async getLeaveRequestsByEmployee(empID: string): Promise<ILeave[]> {
    return await Leave.find({ empID, status: { $ne: 'cancel' } }).sort({ createdAt: -1 });
  }

  static async getAllLeaveRequests(status?: string): Promise<ILeave[]> {
    const query = status ? { status } : { status: { $ne: 'cancel' } };
    return await Leave.find(query).sort({ createdAt: -1 });
  }

  static async approveLeaveRequest(leaveId: string, rejectionReason: string, approvedBy: string, supportingInfo?: string[]): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }

    if (leave.status !== 'created') {
      throw new APIError('Leave request already processed', 400);
    }

    const didntRepeat = await this.checkLeaveRequestDidntRepeat(leave)
    if (!didntRepeat) {
      throw new APIError("請假時間重複!無法完成請假。", 409);
    }

    leave.status = 'approved';
    leave.rejectionReason = rejectionReason;
    leave.approvedBy = approvedBy;

    // Append new supporting files if provided
    if (supportingInfo && supportingInfo.length > 0) {
      leave.supportingInfo = [...(leave.supportingInfo || []), ...supportingInfo];
    }

    const savedLeave = await leave.save();

    return savedLeave;
  }

  static async rejectLeaveRequest(leaveId: string, rejectionReason: string, rejectedBy: string, supportingInfo?: string[]): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }

    if (leave.status !== 'created') {
      throw new APIError('Leave request already processed', 400);
    }

    leave.status = 'rejected';
    leave.rejectionReason = rejectionReason;
    leave.approvedBy = rejectedBy;

    // Append new supporting files if provided
    if (supportingInfo && supportingInfo.length > 0) {
      leave.supportingInfo = [...(leave.supportingInfo || []), ...supportingInfo];
    }

    return await leave.save();
  }

  static async getLeaveRequestById(leaveId: string): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }

    return leave;
  }

  static async cancelLeaveRequest(leaveId: string, cancelledBy: string, reason?: string): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }

    if (leave.status === 'cancel') {
      throw new APIError('Leave request already cancelled', 400);
    }

    leave.status = 'cancel';
    leave.approvedBy = cancelledBy;
    if (reason) {
      leave.rejectionReason = reason; // Reuse rejectionReason field for cancel reason
    }

    return await leave.save();
  }

  static async getCancelLeaveRequests(employeeID?: string): Promise<ILeave[]> {
    const query = employeeID
      ? { empID: employeeID, status: 'cancel' }
      : { status: 'cancel' };

    return await Leave.find(query).sort({ createdAt: -1 });
  }

  static async getLeaveRequestBySequenceNumber(sequenceNumber: number): Promise<ILeave> {
    const leave = await Leave.findOne({ sequenceNumber });
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }

    return leave;
  }

  static async queryLeaveRequests(queryParams: {
    timeStart: string;
    timeEnd: string;
    leaveType?: string;
    status?: string;
  }): Promise<ILeave[]> {
    const { timeStart, timeEnd, leaveType, status } = queryParams;

    // Build query object
    const query: any = {
      $or: [
        // leaveStart is within the time range
        {
          leaveStart: {
            $gte: new Date(timeStart),
            $lte: new Date(timeEnd)
          }
        },
        // leaveEnd is within the time range
        {
          leaveEnd: {
            $gte: new Date(timeStart),
            $lte: new Date(timeEnd)
          }
        },
        // The leave spans across the entire time range
        {
          leaveStart: { $lte: new Date(timeStart) },
          leaveEnd: { $gte: new Date(timeEnd) }
        }
      ]
    };

    // Add optional filters
    if (leaveType) {
      query.leaveType = leaveType;
    }

    if (status) {
      query.status = status;
    }

    return await Leave.find(query).sort({ leaveStart: -1 });
  }

  /**
 * Calculate special leave entitlement in days based on hire date.
 * @param referenceDate defaults to now; pass month-end for report calculations
 */
  static calcAnnualLeaveEntitlementDays(
    hireDate: Date | dayjs.Dayjs,
    referenceDate?: Date | dayjs.Dayjs
  ): number {
    // 1. 統一轉換為 Day.js 物件（不論傳入的是原生 Date 還是 Dayjs 都能相容）
    const ref = dayjs.tz(referenceDate ?? new Date(), "Asia/Taipei");
    const hire = dayjs.tz(hireDate, "Asia/Taipei");

    // 2. 直接使用 .diff() 計算相差的「月數」（浮點數），這會比純減月份更精準
    // 為了完全符合你原本「只看年月、不看日期」的月數計算邏輯，我們可以先把兩者的日期都歸化到當月 1 號
    const refMonthStart = ref.startOf('month');
    const hireMonthStart = hire.startOf('month');

    const monthsDiff = refMonthStart.diff(hireMonthStart, 'month');
    const yearsDiff = monthsDiff / 12;

    // 3. 特休天數級距判斷（保持原本的勞基法邏輯）
    if (monthsDiff < 6) {
      return 0;
    } else if (yearsDiff < 1) {
      return 3;
    } else if (yearsDiff < 2) {
      return 7;
    } else if (yearsDiff < 3) {
      return 10;
    } else if (yearsDiff < 5) {
      return 14;
    } else if (yearsDiff < 10) {
      return 15;
    } else {
      const additionalYears = Math.floor(yearsDiff) - 10;
      return Math.min(16 + additionalYears, 30);
    }
  }

  /**
     * @returns 
     * 1. 去年剩下的時數 = 去年到職日 00:00 (由於有去年時數資料 所以取去年 12/24 開始) 到 今年到職日 或 這個月底
     * 2. 今年剩下的時數 = 如果今年到職日還沒到 = 0, 如果到了 那就是 今年到職日 00:00 到 這個月底
     * 3. total Hours
     * 4. total Remain Hours
     */
  static async calcRemainAnnualLeaveDays(employee: IEmployee, referenceDate: dayjs.Dayjs): Promise<[number, number, number, number]> {
    let res: [number, number, number, number] = [0, 0, 0, 0];
    const baseYear = referenceDate.year();
    const hireDate = dayjsTz(employee.hireDate);
    const annualLeaveDays = await LeaveService.calcAnnualLeaveDaysByEmployee(employee, referenceDate.month(11).date(24).startOf("day"));

    console.log(`annualLeaveDays: ${JSON.stringify(annualLeaveDays)}`)

    // ==================== 核心時間點計算 ====================

    // B. 今年去年到職日起訖日 (將 getYearRanges 的字串結果轉回 Day.js 物件)
    const anniversarys = LeaveService.getYearRanges(hireDate, referenceDate);

    // C. 這個月的起訖時間
    const thisMonthStart = referenceDate.subtract(1, 'month').date(24).startOf('day');
    const thisMonthEnd = referenceDate.date(23).endOf('day');

    // 今年初 (去年 12/24)
    const thisYearStart = referenceDate.subtract(1, 'year').month(11).date(24).startOf("day")

    // ==================== 條件邊界控制 ====================
    // 判斷今年特休是否已開始了
    const isThisYearLeaveStarted = anniversarys.thisYearStart.isBefore(thisMonthEnd);

    const stage1End = isThisYearLeaveStarted ? anniversarys.thisYearStart : thisMonthEnd;

    // ==================== 這個月細分兩段的起訖區間 ====================
    // 上半月：這個月 1 號 -> 到職日前一天 23:59:59 或是這個月底
    // const firstHalfStart = thisMonthStart;
    // const firstHalfEnd = thisMonthEnd.isBefore(workAnniversaryDay)
    //   ? thisMonthEnd
    //   : workAnniversaryDay.subtract(1, 'day').endOf('day');

    // // 下半月：到職日當天 00:00 或是這個月初 -> 這個月底 23:59:59
    // const secondHalfStart = thisMonthStart.isAfter(workAnniversaryDay)
    //   ? thisMonthStart
    //   : workAnniversaryDay;
    // const secondHalfEnd = thisMonthEnd;

    // 區間合法性防呆判斷（若 start > end 則不合法）
    // const isFirstHalfValid = !firstHalfStart.isAfter(firstHalfEnd);
    // const isSecondHalfValid = !secondHalfStart.isAfter(secondHalfEnd);

    // ==================== MongoDB 查詢區塊 ====================
    const sumHours = (docs: ILeave[]): number => docs.reduce((sum, doc) => sum + (parseInt(doc.hour) || 0), 0);

    const [
      lastYearAnnualLeaveHours,
      thisYearAnnualLeaveHours,
      thisMonthHours
      // thisMonthFirstHalfHours,
      // thisMonthSecondHalfHours
    ] = await Promise.all([
      // 1. 去年歷史階段
      Leave.find({
        empID: employee.empID,
        status: 'approved',
        leaveType: "特別休假",
        leaveStart: { $gte: thisYearStart.toDate(), $lte: stage1End.toDate() }
      }).then(docs => { console.log(docs); return docs }).then(docs => sumHours(docs)),

      // 2. 今年歷史階段
      isThisYearLeaveStarted
        ? Leave.find({
          empID: employee.empID,
          status: 'approved',
          leaveType: "特別休假",
          leaveStart: { $gte: anniversarys.thisYearStart.toDate(), $lte: thisMonthEnd.toDate() }
        }).then(docs => sumHours(docs))
        : 0,

      // 3. 這個月
      Leave.find({
        empID: employee.empID,
        status: 'approved',
        leaveType: "特別休假",
        leaveStart: { $gte: thisMonthStart.toDate(), $lte: thisMonthEnd.toDate() }
      }).then(docs => sumHours(docs)),

      // 4. 這個月到職日後 (下半月)
      // Leave.find({
      //   empID: employee.empID,
      //   status: 'approved',
      //   leaveType: "特別休假",
      //   leaveStart: { $gte: secondHalfStart.toDate(), $lte: secondHalfEnd.toDate() }
      // }).then(docs => sumHours(docs))
    ]);

    console.log(`
      lastYearAnnualLeaveHours: ${lastYearAnnualLeaveHours}
      thisYearAnnualLeaveHours: ${thisYearAnnualLeaveHours}
      thisMonthHours: ${thisMonthHours}
      thisYearStart: ${thisYearStart.toISOString()}
      stage1End: ${stage1End.toISOString()}
      anniversarys.thisYearStart: ${anniversarys.thisYearStart.toISOString()}
      anniversarys.thisYearEnd: ${anniversarys.thisYearEnd.toISOString()}
      thisMonthStart: ${thisMonthStart.toISOString()}
      thisMonthEnd: ${thisMonthEnd.toISOString()}
      isThisYearLeaveStarted: ${isThisYearLeaveStarted}
      `)

    // ==================== 特休舊資料相容與結算 ====================
    const remain = legacyLeaveJson.find(l => l.id === employee.empID)?.remain || 0;
    if (baseYear === 2026 && remain) {
      annualLeaveDays[1] = remain; // 去年剩餘時數
      // 註：依你原本邏輯，這裡你可以自由指派 annualLeaveDays[3] 的今年時數
    }

    res = [
      annualLeaveDays[1], // 去年總額
      annualLeaveDays[3], // 今年總額
      annualLeaveDays[1] + annualLeaveDays[3], // 原始總額度
      annualLeaveDays[1] + annualLeaveDays[3], // 剩餘總額度 (預留)
    ];

    // 3. 兩年年假總額
    res[2] = annualLeaveDays[1] + annualLeaveDays[3];

    // 1. 去年剩餘時數：扣除去年歷史、以及這個月到職前的消耗
    res[0] = res[0] - lastYearAnnualLeaveHours;

    // 2. 今年剩餘時數：扣除今年歷史、以及這個月到職後的消耗
    res[1] = res[1] - thisYearAnnualLeaveHours;

    // 4. 真正剩餘的總時數 (去年剩餘 + 今年剩餘)
    res[3] = res[0] + res[1];

    return res;
  }

  /**
   * @returns 
   * 1. lastyear Days
   * 2. lastyear Hours
   * 3. this year Days
   * 4. this year Hours
   */
  static async calcAnnualLeaveDaysByEmployee(employee: IEmployee, referenceDate: dayjs.Dayjs): Promise<[number, number, number, number]> {
    const res: [number, number, number, number] = [0, 0, 0, 0]

    const lastYear = dayjsTz(referenceDate).subtract(1, "year")
    const hireDate = dayjsTz(employee.hireDate)

    console.log("employee: ", employee.name)
    console.log("hireDate: ", employee.hireDate)
    // console.log("hireDate2: ", hireDate)
    console.log("referenceDate: ", referenceDate.toISOString())
    console.log("lastYear: ", lastYear.toISOString())

    const adjusts = await this.getAdjustedAnnualLeaveHours(employee, referenceDate)

    res[0] = this.calcAnnualLeaveEntitlementDays(hireDate, lastYear) + adjusts.lastYearDays
    res[1] = res[0] * 8
    res[2] = this.calcAnnualLeaveEntitlementDays(hireDate, referenceDate) + adjusts.thisYearDays
    res[3] = res[2] * 8

    console.log("calcAnnualLeaveDaysByEmployee res: ", res)
    return res
  }

  /**
   * Return adjusted annual leave hours for this year and last year.
   * Base entitlement comes from calcAnnualLeaveDaysByEmployee().
   * LeaveAdjustment records (特別休假) are partitioned by effectiveDate
   * into the matching anniversary-year range and added to each year's total.
   */
  static async getAdjustedAnnualLeaveHours(
    employee: IEmployee,
    referenceDate: dayjs.Dayjs
  ): Promise<{ lastYearDays: number; thisYearDays: number; lastYearHours: number; thisYearHours: number }> {
    // Base entitlement uses Dec-24 boundary consistent with calcRemainAnnualLeaveDays
    const dec24Ref = referenceDate.month(11).date(24).startOf('day');
    // const [, lastYearBaseHours, , thisYearBaseHours] = this.calcAnnualLeaveDaysByEmployee(employee, dec24Ref);

    // Anniversary-year ranges to partition adjustments
    const hireDate = dayjsTz(employee.hireDate);
    const { lastYearStart, lastYearEnd, thisYearStart, thisYearEnd } = this.getYearRanges(hireDate, referenceDate);

    const adjustments = await LeaveAdjustment.find({
      empID: employee.empID,
      leaveType: '特別休假'
    });

    let lastYearAdjMinutes = 0;
    let thisYearAdjMinutes = 0;

    for (const adj of adjustments) {
      const adjDate = dayjsTz(adj.effectiveDate);
      if (!adjDate.isBefore(lastYearStart) && !adjDate.isAfter(lastYearEnd)) {
        lastYearAdjMinutes += adj.minutes;
      } else if (!adjDate.isBefore(thisYearStart) && !adjDate.isAfter(thisYearEnd)) {
        thisYearAdjMinutes += adj.minutes;
      }
    }
    const res = {
      lastYearDays: (lastYearAdjMinutes / 60) / 8,
      thisYearDays: (thisYearAdjMinutes / 60) / 8,
      lastYearHours: lastYearAdjMinutes / 60,
      thisYearHours: thisYearAdjMinutes / 60
    };


    console.log("getAdjustedAnnualLeaveHours res: ", res)

    return res
    // return {
    //   lastYearHours: lastYearBaseHours + lastYearAdjMinutes / 60,
    //   thisYearHours: thisYearBaseHours + thisYearAdjMinutes / 60
    // };
  }

  static getYearRanges(hireDate: dayjs.Dayjs, referenceDate: dayjs.Dayjs) {

    // 1. 直接用 dayjs 抓取入職的月、日，以及基準日的年 (不用擔心月份 0-11 的問題了)
    const hireMonth = hireDate.month(); // 0-11，但 dayjs 內部會自己處理，不影響設定
    const hireDay = hireDate.date();
    const baseYear = referenceDate.year();

    // 2. 建立基準點：referenceDate 當年的入職週年日
    // 使用 .set() 同時設定年月日常數，並將時分秒歸零 (00:00:00) 確保比較與計算精準
    const thisStart = referenceDate.clone()
      .year(baseYear)
      .month(hireMonth)
      .date(hireDay)
      .hour(0).minute(0).second(0).millisecond(0);

    // 3. 利用 dayjs 的 .add() 和 .subtract() 直覺地推算各個日期
    const thisEnd = thisStart.add(1, 'year').subtract(1, 'day').hour(23).minute(59).second(59);
    const lastStart = thisStart.subtract(1, 'year');
    const lastEnd = thisStart.subtract(1, 'day').hour(23).minute(59).second(59);

    return {
      lastYearStart: dayjsTz(lastStart),
      lastYearEnd: dayjsTz(lastEnd),
      thisYearStart: dayjsTz(thisStart),
      thisYearEnd: dayjsTz(thisEnd)
    };

    // // 4. 定義格式化格式，直接呼叫 .format() 
    // const FORMAT_STR = 'YYYY/MM/DD';

    // return {
    //   lastYearStart: lastStart.format(FORMAT_STR),
    //   lastYearEnd: lastEnd.format(FORMAT_STR),
    //   thisYearStart: thisStart.format(FORMAT_STR),
    //   thisYearEnd: thisEnd.format(FORMAT_STR)
    // };
  }

  /**
   * Bulk import leave records from legacy data.
   * leaveStart/leaveEnd are Chinese date strings like "1月7日".
   * leaveEnd datetime = parsed leaveStart date at 09:00 + hour duration.
   * All records are inserted as status='approved', skipping overlap checks.
   */
  static async importLeaveRequests(records: {
    empID: string;
    leaveType: string;
    reason?: string;
    year: string;
    leaveStart: string;
    leaveEnd: string;
    hour: string;
  }[]): Promise<{ imported: number; errors: { index: number; empID: string; message: string }[] }> {
    let imported = 0;
    const errors: { index: number; empID: string; message: string }[] = [];

    for (let i = 0; i < records.length; i++) {
      const { empID, leaveType, reason, year, leaveStart: startStr, leaveEnd: endStr, hour } = records[i];
      try {
        const employee = await Employee.findOne({ empID });
        if (!employee) {
          errors.push({ index: i, empID, message: `找不到員工 ${empID}` });
          continue;
        }

        const startDate = parseChineseDate(year, startStr);
        if (!startDate) {
          errors.push({ index: i, empID, message: `無法解析日期: ${startStr}` });
          continue;
        }

        const hours = parseFloat(hour);
        if (isNaN(hours) || hours <= 0) {
          errors.push({ index: i, empID, message: `無效的時數: ${hour}` });
          continue;
        }

        const endDate = parseChineseDate(year, endStr, true);
        if (!endDate) {
          errors.push({ index: i, empID, message: `無法解析日期: ${endStr}` });
          continue;
        }
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);

        await Leave.create({
          empID,
          name: employee.name,
          department: employee.department || '',
          leaveType,
          reason: reason || '',
          leaveStart: startDate.toDate(),
          leaveEnd: endDate.toDate(),
          YYYY: startDate.format('YYYY'),
          mm: startDate.format('MM'),
          DD: startDate.format('DD'),
          hour: String(wholeHours),
          minutes: String(minutes),
          status: 'approved'
        });

        imported++;
      } catch (err: any) {
        errors.push({ index: i, empID, message: err.message || '未知錯誤' });
      }
    }

    return { imported, errors };
  }

  static async CheckLeaveBalance(empID: string, type: LeaveType, start: Dayjs, end: Dayjs): Promise<{ sufficient: boolean, msg: string }> {


    const reservationTypes = RESERVATION_LEAVE_TYPES.map(t => t.type);
    const leaveTypesToCheck = ['事假', '普通傷病假', '特別休假', ...reservationTypes];
    if (!leaveTypesToCheck.includes(type)) {
      return { sufficient: true, msg: "" }; // Skip validation for other leave types
    }

    const balance = await this.getUserLeaveBalance(empID, start, end)
    const workingDurentObj = calcWorkingDuration(start, end, { useStandard4HourBlocks: true });
    const requestedHours = workingDurentObj.hourFormat

    let remainingHours = 0;
    let leaveTypeName = '';

    switch (type) {
      case '事假':
        remainingHours = balance.personalLeave.remainingHours;
        leaveTypeName = '事假';
        break;
      case '普通傷病假':
        remainingHours = balance.sickLeave.remainingHours;
        leaveTypeName = '病假';
        break;
      case '特別休假':
        remainingHours = balance.specialLeave.remainingHours;
        leaveTypeName = '特休';
        break;
      default: {
        const found = balance.reservationLeaves.find(l => l.type === type);
        if (found) {
          remainingHours = found.remainingHours;
          leaveTypeName = found.displayName;
        }
      }
    }

    if (workingDurentObj.hourFormat > remainingHours) {
      return {
        sufficient: false, msg:
          `${leaveTypeName}剩餘時數為 ${remainingHours.toFixed(1)} 小時，` +
          `但此次申請需要 ${requestedHours.toFixed(1)} 小時。\n` +
          `超出額度 ${(requestedHours - remainingHours).toFixed(1)} 小時。\n`
      };
    }
    return { sufficient: true, msg: "" };
  }

  //  import { Dayjs } from 'dayjs';

  /**
   * Return the full leave balance for an employee.
   * Queries DB directly; respects adjustment effectiveDate/expiryDate ranges.
   */
  static async getUserLeaveBalance(
    empID: string,
    start?: Dayjs,
    end?: Dayjs
  ): Promise<UserLeaveData> {
    const now = new Date();

    // 1. 決定 Leave 的時間篩選範圍（若無帶入則維持原本的前後一年預設值）
    const oneYearBefore = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneYearAfter = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    const queryStart = start ? start.toDate() : oneYearBefore;
    const queryEnd = end ? end.toDate() : oneYearAfter;

    const dateFilter = {
      $or: [
        { leaveStart: { $gte: oneYearBefore, $lte: oneYearAfter } },
        { leaveEnd: { $gte: oneYearBefore, $lte: oneYearAfter } },
        { leaveStart: { $lte: oneYearBefore }, leaveEnd: { $gte: oneYearAfter } }
      ]
    };

    // 2. 建立 LeaveAdjustment 的時間篩選條件
    // 邏輯：(effectiveDate 沒填 OR <= queryEnd) AND (expiryDate 沒填 OR >= queryStart)
    const adjDateFilter = {
      $and: [
        {
          $or: [
            { effectiveDate: { $exists: false } },
            { effectiveDate: null },
            { effectiveDate: { $lte: queryEnd } }
          ]
        },
        {
          $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: null },
            { expiryDate: { $gte: queryStart } }
          ]
        }
      ]
    };

    const employee = await Employee.findOne({ empID });
    const hireDate = employee?.hireDate ? new Date(employee.hireDate) : undefined;
    const specialTotalDays = hireDate ? LeaveService.calcAnnualLeaveEntitlementDays(hireDate) : 0;

    // 3. 查詢 Leaves
    const [personalLeaves, sickLeaves, specialLeaves] = await Promise.all([
      Leave.find({ empID, leaveType: '事假', status: 'approved', ...dateFilter }),
      Leave.find({ empID, leaveType: '普通傷病假', status: 'approved', ...dateFilter }),
      Leave.find({ empID, leaveType: '特別休假', status: 'approved', ...dateFilter })
    ]);

    // 4. 查詢 Adjustments（加上 adjDateFilter）
    const [personalAdj, sickAdj, specialAdj] = await Promise.all([
      LeaveAdjustment.find({ empID, leaveType: '事假', ...adjDateFilter }),
      LeaveAdjustment.find({ empID, leaveType: '普通傷病假', ...adjDateFilter }),
      LeaveAdjustment.find({ empID, leaveType: '特別休假', ...adjDateFilter })
    ]);

    // 5. 查詢彈性假別與其 Adjustments
    const [reservationLeaveResults, reservationAdjResults] = await Promise.all([
      Promise.all(RESERVATION_LEAVE_TYPES.map(rt =>
        Leave.find({ empID, leaveType: rt.type, status: 'approved', ...dateFilter })
      )),
      Promise.all(RESERVATION_LEAVE_TYPES.map(rt =>
        LeaveAdjustment.find({ empID, leaveType: rt.type, ...adjDateFilter })
      ))
    ]);

    const reservationLeaves: LeaveData[] = RESERVATION_LEAVE_TYPES.map((rt, i) =>
      buildStandardLeaveData(rt.type, rt.displayName, 0, reservationLeaveResults[i], reservationAdjResults[i])
    );

    return {
      personalLeave: buildStandardLeaveData('事假', '事假', 14 * 8 * 60, personalLeaves, personalAdj),
      sickLeave: buildStandardLeaveData('普通傷病假', '病假', 30 * 8 * 60, sickLeaves, sickAdj),
      specialLeave: buildStandardLeaveData('特別休假', '特休', specialTotalDays * 8 * 60, specialLeaves, specialAdj),
      reservationLeaves
    };
  }
}