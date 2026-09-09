import { Leave, ILeave, Employee, Attendance, LeaveAdjustment, ILeaveAdjustment, LegacyLeave, IEmployee } from '../models';
import { APIError } from '../middleware/errorHandler';
import { isWeekend, dayjsNum, parseJSONfromFile, dayjsTz, parseChineseDate, errorToString, dayjsToTz } from '../util/utility';
import { holidayService } from './holidayService';
import { RETURN_TAIWAN_LEAVE_TYPE, ReturnTaiwanLeaveService } from './returnTaiwanLeaveService';
import * as XLSX from 'xlsx';
import { promises } from 'dns';
import legacyLeaveJson from "../config/legacyLeave.json"
import dayjs, { Dayjs } from 'dayjs';
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { calcWorkingDuration, calcWorkingDurationHelper } from './workingTimeCalcService';
dayjs.extend(utc);
dayjs.extend(timezone);

export type DurentObject = {
  minuteFormat: number;
  hourFormat: number
  crossBreaktime: number;
  crossNight: number;
  crossholiday: number;
}

export interface FixLeaveEndDatesResult {
  scanned: number; // records matching the "leaveStart & leaveEnd both at 08:30" bug
  fixed: number;
  skipped: { leaveId: string; sequenceNumber?: number; reason: string }[];
}

export interface CheckLeaveBalanceRes {
  sufficient: boolean,
  msg: string,
  remainingHours: number,
  requestedHours: number
}

export const leaveDisplaynameConverter = (type: string): string => {
  switch (type) {
    case "普通傷病假":
      return "病假"
    case "特別休假":
      return "特休"
    default:
      return type
  }
}

// Leave types whose total allocation comes entirely from HR-entered adjustments.
export const RESERVATION_LEAVE_TYPES: { type: LeaveType; displayName?: string }[] = [
  { type: '婚假', displayName: '婚假' },
  { type: '喪假', displayName: '喪假' },
  { type: '生理假', displayName: '生理假' },
  { type: '公傷病假', displayName: '公傷病假' },
  { type: '公假', displayName: '公假' },
  { type: '產假', displayName: '產假' },
  { type: '產檢假', displayName: '產檢假' },
  { type: '陪產檢及陪產假', displayName: '陪產檢及陪產假' },
  { type: '安胎休養請假', displayName: '安胎休養請假' },
  { type: '育嬰留職停薪', displayName: '育嬰留職停薪' },
];

export type LeaveType = "婚假" | "喪假" | '事假' | '普通傷病假' | '特別休假' | "生理假" | "公傷病假" | "公假" | "產假" | "產檢假" | "陪產檢及陪產假" | "安胎休養請假" | "育嬰留職停薪" | typeof RETURN_TAIWAN_LEAVE_TYPE

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
  returnTaiwanLeave?: LeaveData;
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

  /**
   * A substitute must be available to cover for the person they're standing in for,
   * so they can't also be on leave during that window. Returns true when `empID` is
   * free to take leave over [leaveStart, leaveEnd]; false if it overlaps a period
   * where `empID` is still committed as someone else's substitute (status 'created'
   * or 'approved' — a rejected/cancelled leave never materializes, so it's excluded).
   */
  static async checkSubstituteAvailability(empID: string, leaveStart: Dayjs, leaveEnd: Dayjs): Promise<boolean> {
    const substituteDuties = await Leave.find({
      substitute: empID,
      status: { $in: ['created', 'approved'] }
    });

    return !substituteDuties.some(duty => {
      const dutyStart = dayjsTz(duty.leaveStart);
      const dutyEnd = dayjsTz(duty.leaveEnd);
      return leaveStart.isBefore(dutyEnd) && leaveEnd.isAfter(dutyStart);
    });
  }

  /**
   * The chosen substitute can't already be on leave (as the requester of their own
   * leave, status 'created' or 'approved') during the window they're being asked to
   * cover. Returns true when `substituteEmpID` is free over [leaveStart, leaveEnd].
   */
  static async checkSubstituteIsFree(substituteEmpID: string, leaveStart: Dayjs, leaveEnd: Dayjs): Promise<boolean> {
    const substituteLeaves = await Leave.find({
      empID: substituteEmpID,
      status: { $in: ['created', 'approved'] }
    });

    return !substituteLeaves.some(existingLeave => {
      const existingStart = dayjsTz(existingLeave.leaveStart);
      const existingEnd = dayjsTz(existingLeave.leaveEnd);
      return leaveStart.isBefore(existingEnd) && leaveEnd.isAfter(existingStart);
    });
  }

  static async createLeaveRequest(empID: string, leaveData: {
    leaveType: string;
    reason: string;
    leaveStart: string;
    leaveEnd: string;
    substitute: string;
    supportingInfo?: string[];
    agent?: string;
    rejectionReason?: string;
  }): Promise<ILeave> {
    const employee = await Employee.findOne({ empID, isActive: true });
    if (!employee) {
      throw new APIError('Employee not found', 404);
    }

    if (!leaveData.substitute) {
      throw new APIError('請選擇代理人', 400);
    }

    if (leaveData.substitute === empID) {
      throw new APIError('代理人不能是本人', 400);
    }

    const substituteEmployee = await Employee.findOne({
      empID: leaveData.substitute,
      isActive: true,
      // department: employee.department
    });
    if (!substituteEmployee) {
      throw new APIError('代理人不存在、非在職，或部門不符', 400);
    }

    const leaveStart = dayjsToTz(leaveData.leaveStart)
    const leaveEnd = dayjsToTz(leaveData.leaveEnd)

    const isAvailableAsSubstitute = await this.checkSubstituteAvailability(empID, leaveStart, leaveEnd);
    if (!isAvailableAsSubstitute) {
      throw new APIError('您在此期間需擔任其他同事的代理人，無法同時請假', 409);
    }

    const isSubstituteFree = await this.checkSubstituteIsFree(leaveData.substitute, leaveStart, leaveEnd);
    if (!isSubstituteFree) {
      throw new APIError('您指定的代理人於此時段無法代理', 409);
    }

    if (leaveData.leaveType === RETURN_TAIWAN_LEAVE_TYPE) {
      await ReturnTaiwanLeaveService.assertRequestAllowed(employee, leaveStart, leaveEnd);
    }

    const workingDurationRes = await calcWorkingDurationHelper(leaveStart, leaveEnd);

    const totalMinutes = Math.floor(workingDurationRes.workingMinutes);
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
      status: 'created',
      substitute: leaveData.substitute,
      agent: leaveData.agent,
      rejectionReason: leaveData.rejectionReason
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

  static async substituteApproveLeaveRequest(leaveId: string, requesterEmpID: string, memo?: string): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }
    if (leave.substitute !== requesterEmpID) {
      throw new APIError('無權限：您不是此申請的代理人', 403);
    }
    if (leave.substituteApproveStatus !== 'pending') {
      throw new APIError('此申請已完成代理審核', 400);
    }
    if (leave.status !== 'created') {
      throw new APIError('此申請已被人事/管理員處理', 400);
    }

    leave.substituteApproveStatus = 'approved';
    leave.substituteMemo = memo;
    leave.substituteApproveAt = new Date();

    return await leave.save();
  }

  static async substituteRejectLeaveRequest(leaveId: string, requesterEmpID: string, memo: string): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }
    if (leave.substitute !== requesterEmpID) {
      throw new APIError('無權限：您不是此申請的代理人', 403);
    }
    if (leave.substituteApproveStatus !== 'pending') {
      throw new APIError('此申請已完成代理審核', 400);
    }
    if (leave.status !== 'created') {
      throw new APIError('此申請已被人事/管理員處理', 400);
    }

    leave.substituteApproveStatus = 'rejected';
    leave.substituteMemo = memo;
    leave.substituteApproveAt = new Date();

    return await leave.save();
  }

  static async managerApproveLeaveRequest(leaveId: string, requesterEmpID: string, memo?: string): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }
    const ownerEmployee = await Employee.findOne({ empID: leave.empID });
    if (!ownerEmployee?.manager || ownerEmployee.manager !== requesterEmpID) {
      throw new APIError('無權限：您不是此申請人的主管', 403);
    }
    if (leave.managerApproveStatus !== 'pending') {
      throw new APIError('此申請已完成主管審核', 400);
    }
    if (leave.substituteApproveStatus !== 'approved') {
      throw new APIError('請先完成代理人審核', 400);
    }
    if (leave.status !== 'created') {
      throw new APIError('此申請已被人事/管理員處理', 400);
    }

    leave.manager = requesterEmpID;
    leave.managerApproveStatus = 'approved';
    leave.managerMemo = memo;
    leave.managerApproveAt = new Date();

    return await leave.save();
  }

  static async managerRejectLeaveRequest(leaveId: string, requesterEmpID: string, memo: string): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }
    const ownerEmployee = await Employee.findOne({ empID: leave.empID });
    if (!ownerEmployee?.manager || ownerEmployee.manager !== requesterEmpID) {
      throw new APIError('無權限：您不是此申請人的主管', 403);
    }
    if (leave.managerApproveStatus !== 'pending') {
      throw new APIError('此申請已完成主管審核', 400);
    }
    if (leave.substituteApproveStatus !== 'approved') {
      throw new APIError('請先完成代理人審核', 400);
    }
    if (leave.status !== 'created') {
      throw new APIError('此申請已被人事/管理員處理', 400);
    }

    leave.manager = requesterEmpID;
    leave.managerApproveStatus = 'rejected';
    leave.managerMemo = memo;
    leave.managerApproveAt = new Date();

    return await leave.save();
  }

  static async getPendingSubstituteLeaveRequests(empID: string): Promise<ILeave[]> {
    return await Leave.find({ substitute: empID, substituteApproveStatus: 'pending', status: 'created' }).sort({ createdAt: -1 });
  }

  static async getPendingManagerLeaveRequests(managerEmpID: string): Promise<ILeave[]> {
    const managedEmpIDs = (await Employee.find({ manager: managerEmpID }).select('empID')).map(e => e.empID);
    if (managedEmpIDs.length === 0) return [];
    return await Leave.find({ empID: { $in: managedEmpIDs }, managerApproveStatus: 'pending', substituteApproveStatus: 'approved', status: 'created' }).sort({ createdAt: -1 });
  }

  static async getLeaveRequestById(leaveId: string): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }

    return leave;
  }

  // Append supporting files to an existing leave request, regardless of its current
  // status/stage — used by HR/Admin to backfill missing documents (e.g. during the
  // system-migration catch-up window).
  static async addLeaveSupportingInfo(leaveId: string, filePaths: string[]): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }

    leave.supportingInfo = [...(leave.supportingInfo || []), ...filePaths];

    return await leave.save();
  }

  // Remove a single supporting file from an existing leave request — the HR-side
  // counterpart to addLeaveSupportingInfo, for the same migration catch-up window.
  static async removeLeaveSupportingInfo(leaveId: string, filePath: string): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }

    leave.supportingInfo = (leave.supportingInfo || []).filter(path => path !== filePath);

    return await leave.save();
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
    const ref = dayjs.tz(referenceDate ?? new Date(), "Asia/Taipei").startOf('day');
    const hire = dayjs.tz(hireDate, "Asia/Taipei").startOf('day');
    const monthsDiff = ref.diff(hire, 'month');
    const yearsDiff = ref.diff(hire, 'year');

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
      return Math.min(16 + yearsDiff - 10, 30);
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
    const hireDate = dayjsTz(employee.hireDate);
    const { lastYearEnd, thisYearEnd } = this.getYearRanges(hireDate, referenceDate);
    const adjusts = await this.getAdjustedAnnualLeaveHours(employee, referenceDate);
    const lastYearDays = this.calcAnnualLeaveEntitlementDays(hireDate, lastYearEnd) + adjusts.lastYearDays;
    const thisYearDays = this.calcAnnualLeaveEntitlementDays(hireDate, thisYearEnd) + adjusts.thisYearDays;

    return [lastYearDays, lastYearDays * 8, thisYearDays, thisYearDays * 8];
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


  static async CheckLeaveBalance(empID: string, type: LeaveType, start: Dayjs, end: Dayjs): Promise<CheckLeaveBalanceRes> {
    //// 返台假相關 ////
    if (type === RETURN_TAIWAN_LEAVE_TYPE) {
      try {
        await ReturnTaiwanLeaveService.assertRequestAllowedForEmpID(empID, start, end);
        return { sufficient: true, msg: '', remainingHours: 0, requestedHours: 0 };
      } catch (error) {
        if (error instanceof APIError) {
          return { sufficient: false, msg: error.message, remainingHours: 0, requestedHours: 0 };
        }
        throw error;
      }
    }

    const reservationTypes = RESERVATION_LEAVE_TYPES.map(t => t.type);
    const leaveTypesToCheck = ['事假', '普通傷病假', '特別休假', ...reservationTypes];
    if (!leaveTypesToCheck.includes(type)) {
      return { sufficient: true, msg: "", remainingHours: 0, requestedHours: 0 }; // Skip validation for other leave types
    }

    const balance = await this.getUserLeaveBalance(empID, start, end)
    const workingDurentRes =await calcWorkingDurationHelper(start, end);
    const requestedHours = Math.round(workingDurentRes.workingMinutes / 60)

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

    if (requestedHours > remainingHours) {
      return {
        sufficient: false, msg:
          `${leaveTypeName}剩餘時數為 ${remainingHours.toFixed(0)} 小時，` +
          `但此次申請需要 ${requestedHours.toFixed(0)} 小時。\n` +
          `超出額度 ${(requestedHours - remainingHours).toFixed(0)} 小時。\n`,
        remainingHours, requestedHours
      };
    }
    return { sufficient: true, msg: "", remainingHours, requestedHours };
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
    const nowDayJS = dayjsTz(now)

    // 1. 決定 Leave 的時間篩選範圍（若無帶入則維持原本的前後一年預設值）
    // const oneYearBefore = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    // const oneYearAfter = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    const leaveBeforeBound = nowDayJS.subtract(1, "year").month(12).day(24).startOf('day');
    const leaveAfterBound = nowDayJS.month(12).day(23).endOf('day');
    const queryStart = start ? start.toDate() : leaveBeforeBound;
    const queryEnd = end ? end.toDate() : leaveAfterBound;

    const dateFilter = {
      $or: [
        { leaveStart: { $gte: leaveBeforeBound, $lte: leaveAfterBound } },
        { leaveEnd: { $gte: leaveBeforeBound, $lte: leaveAfterBound } },
        { leaveStart: { $lte: leaveBeforeBound }, leaveEnd: { $gte: leaveAfterBound } }
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
    const hireDate = employee?.hireDate ? dayjsTz(employee.hireDate) : dayjsTz();
    const specialTotalDays = hireDate ? LeaveService.calcAnnualLeaveEntitlementDays(hireDate) : 0;
    const returnTaiwanBalance = employee
      ? await ReturnTaiwanLeaveService.getBalance(employee, start ? dayjsToTz(start) : nowDayJS)
      : undefined;

    // 針對特休 假設今天在今年到職日前
    // 應該找出去年到職日後到現在請的假
    // 假設在今年到職日後
    // 應該找出今年到職日後請的假
    const hireDateThisYear = hireDate.set('year', dayjs().year())
    const hireDateBeforeaYear = hireDateThisYear.subtract(1, "year")
    const hireDateAfteraYear = hireDateThisYear.add(1, "year")
    const annualLeaveBeforeBound = nowDayJS.isBefore(hireDateThisYear) ? hireDateBeforeaYear : hireDateThisYear
    const annualLeaveAfterBound = nowDayJS.isBefore(hireDateThisYear) ? hireDateThisYear : hireDateAfteraYear
    const annualLeaveFilter = {
      $or: [
        { leaveStart: { $gte: annualLeaveBeforeBound, $lte: annualLeaveAfterBound } },
        { leaveEnd: { $gte: annualLeaveBeforeBound, $lte: annualLeaveAfterBound } },
        { leaveStart: { $lte: annualLeaveBeforeBound }, leaveEnd: { $gte: annualLeaveAfterBound } }
      ]
    };

    // 3. 查詢 Leaves
    const [personalLeaves, sickLeaves, specialLeaves] = await Promise.all([
      Leave.find({ empID, leaveType: '事假', status: 'approved', ...dateFilter }),
      Leave.find({ empID, leaveType: '普通傷病假', status: 'approved', ...dateFilter }),
      Leave.find({ empID, leaveType: '特別休假', status: 'approved', ...annualLeaveFilter })
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
      buildStandardLeaveData(rt.type, rt.displayName ? rt.displayName : rt.type, 0, reservationLeaveResults[i], reservationAdjResults[i])
    );

    return {
      personalLeave: buildStandardLeaveData('事假', '事假', 14 * 8 * 60, personalLeaves, personalAdj),
      sickLeave: buildStandardLeaveData('普通傷病假', '病假', 30 * 8 * 60, sickLeaves, sickAdj),
      specialLeave: buildStandardLeaveData('特別休假', '特休', specialTotalDays * 8 * 60, specialLeaves, specialAdj),
      ...(returnTaiwanBalance?.eligible && {
        returnTaiwanLeave: {
          type: RETURN_TAIWAN_LEAVE_TYPE,
          displayName: RETURN_TAIWAN_LEAVE_TYPE,
          totalHours: returnTaiwanBalance.totalHours,
          usedHours: returnTaiwanBalance.usedHours,
          remainingHours: returnTaiwanBalance.remainingHours,
          leaves: returnTaiwanBalance.leaves,
          adjustments: returnTaiwanBalance.adjustments
        }
      }),
      reservationLeaves
    };
  }

  /**
   * Data-fix for leave records where leaveStart and leaveEnd were both saved as 08:30
   * (leaveEnd was never actually calculated). Recomputes leaveEnd from the stored
   * hour/minutes duration, treating one workday as 8 standard hours
   * (08:30-12:00 morning, 13:00-17:30 afternoon, matching workingTimeCalcService's
   * useStandard4HourBlocks weighting) and skipping weekends/registered holidays.
   */
  static async fixMissingLeaveEndDates(dryRun: boolean = false): Promise<FixLeaveEndDatesResult> {
    const TZ = 'Asia/Taipei';
    const STD_HALF_DAY_MINS = 4 * 60;
    const STD_FULL_DAY_MINS = STD_HALF_DAY_MINS * 2;
    const REAL_MORNING_MINS = 3.5 * 60;
    const REAL_AFTERNOON_MINS = 4.5 * 60;

    const leaves = await Leave.find({});
    const holidays = await holidayService.getAllHolidays();
    const holidaySet = new Set(holidays.map(h => dayjs(h.date).tz(TZ).format('YYYY-MM-DD')));

    const result: FixLeaveEndDatesResult = { scanned: 0, fixed: 0, skipped: [] };

    for (const leave of leaves) {
      const start = dayjs(leave.leaveStart).tz(TZ);
      const end = dayjs(leave.leaveEnd).tz(TZ);

      const isBrokenTime = start.hour() === 8 && start.minute() === 30 &&
        end.hour() === 8 && end.minute() === 30;
      if (!isBrokenTime) continue;

      result.scanned++;

      const hourNum = parseInt(leave.hour, 10);
      const minuteNum = parseInt(leave.minutes || '0', 10);

      if (isNaN(hourNum) || hourNum < 0) {
        result.skipped.push({ leaveId: (leave._id as any).toString(), sequenceNumber: leave.sequenceNumber, reason: `無效的 hour 欄位: "${leave.hour}"` });
        continue;
      }

      let remaining = hourNum * 60 + (isNaN(minuteNum) ? 0 : minuteNum);
      if (remaining <= 0) {
        result.skipped.push({ leaveId: (leave._id as any).toString(), sequenceNumber: leave.sequenceNumber, reason: '請假時數為 0，無需修正' });
        continue;
      }

      let cursor = start.startOf('day');
      let newEnd: Dayjs | null = null;

      for (let safety = 0; safety < 3650 && !newEnd; safety++) {
        const dow = cursor.day();
        const isWeekend = dow === 0 || dow === 6;
        const isHoliday = holidaySet.has(cursor.format('YYYY-MM-DD'));

        if (isWeekend || isHoliday) {
          cursor = cursor.add(1, 'day');
          continue;
        }

        if (remaining <= STD_HALF_DAY_MINS) {
          const realMinutes = (remaining / STD_HALF_DAY_MINS) * REAL_MORNING_MINS;
          newEnd = cursor.hour(8).minute(30).second(0).millisecond(0).add(realMinutes, 'minute');
        } else if (remaining <= STD_FULL_DAY_MINS) {
          const realMinutes = ((remaining - STD_HALF_DAY_MINS) / STD_HALF_DAY_MINS) * REAL_AFTERNOON_MINS;
          newEnd = cursor.hour(13).minute(0).second(0).millisecond(0).add(realMinutes, 'minute');
        } else {
          remaining -= STD_FULL_DAY_MINS;
          cursor = cursor.add(1, 'day');
        }
      }

      if (!newEnd) {
        result.skipped.push({ leaveId: (leave._id as any).toString(), sequenceNumber: leave.sequenceNumber, reason: '無法計算結束日期（超過安全上限）' });
        continue;
      }

      if (!dryRun) {
        leave.leaveEnd = newEnd.toDate();
        await leave.save();
      }
      result.fixed++;
    }

    return result;
  }
}