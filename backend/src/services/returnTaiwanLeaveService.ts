import { Employee, IEmployee, ILeave, ILeaveAdjustment, Leave, LeaveAdjustment, Variable } from '../models';
import { APIError } from '../middleware/errorHandler';
import { dayjsTz, dayjsToTz } from '../util/utility';
import { calcWorkingDuration } from './workingTimeCalcService';
import { Dayjs } from 'dayjs';

export const RETURN_TAIWAN_LEAVE_TYPE = '返台假';
const RETURN_TAIWAN_JOB_TITLE = '台幹';
const HOURS_PER_DAY = 8;

export type ReturnTaiwanLeaveBalance = {
  eligible: boolean;
  totalDays: number;
  totalHours: number;
  usedHours: number;
  remainingHours: number;
  leaves: ILeave[];
  adjustments: ILeaveAdjustment[];
};

const sumLeaveMinutes = (leaves: ILeave[], start: Dayjs, end: Dayjs): number =>
  leaves.reduce((total, leave) => {
    const leaveStart = dayjsTz(leave.leaveStart);
    const leaveEnd = dayjsTz(leave.leaveEnd);
    const clippedStart = leaveStart.isBefore(start) ? start : leaveStart;
    const clippedEnd = leaveEnd.isAfter(end) ? end : leaveEnd;

    if (!clippedEnd.isAfter(clippedStart)) {
      return total;
    }

    return total + calcWorkingDuration(clippedStart, clippedEnd, { useStandard4HourBlocks: true }).minuteFormat;
  }, 0);

const sumAdjustmentMinutes = (adjustments: ILeaveAdjustment[]): number =>
  adjustments.reduce((total, adjustment) => total + adjustment.minutes, 0);

export class ReturnTaiwanLeaveService {
  static async isEligible(employee: IEmployee): Promise<boolean> {
    if (!employee.jobTitle) {
      return false;
    }

    return Boolean(await Variable.exists({
      section: 'jobType',
      code: employee.jobTitle,
      description: RETURN_TAIWAN_JOB_TITLE,
      isActive: true
    }));
  }

  static getEntitlementDays(hireDate: Date, referenceDate: Dayjs): number {
    const hire = dayjsTz(hireDate).startOf('day');
    const reference = referenceDate.startOf('day');
    const months = reference.diff(hire, 'month', true);

    if (months < 3) {
      return 0;
    }

    const completedYears = reference.diff(hire, 'year');
    if (completedYears < 2) {
      return 15;
    }

    return Math.min(14 + completedYears, 20);
  }

  static getPeriod(hireDate: Date, referenceDate: Dayjs): { start: Dayjs; end: Dayjs } {
    const hire = dayjsTz(hireDate);
    const anniversary = referenceDate
      .year(referenceDate.year())
      .month(hire.month())
      .date(hire.date())
      .startOf('day');
    const start = referenceDate.isBefore(anniversary) ? anniversary.subtract(1, 'year') : anniversary;

    return { start, end: start.add(1, 'year').subtract(1, 'millisecond') };
  }

  static async getBalance(employee: IEmployee, referenceDate: Dayjs): Promise<ReturnTaiwanLeaveBalance> {
    if (!employee.hireDate || !await this.isEligible(employee)) {
      return { eligible: false, totalDays: 0, totalHours: 0, usedHours: 0, remainingHours: 0, leaves: [], adjustments: [] };
    }

    const period = this.getPeriod(employee.hireDate, referenceDate);
    const entitlementDays = this.getEntitlementDays(employee.hireDate, referenceDate);
    const periodFilter = {
      $or: [
        { leaveStart: { $gte: period.start.toDate(), $lte: period.end.toDate() } },
        { leaveEnd: { $gte: period.start.toDate(), $lte: period.end.toDate() } },
        { leaveStart: { $lte: period.start.toDate() }, leaveEnd: { $gte: period.end.toDate() } }
      ]
    };
    const adjustmentFilter = {
      $and: [
        { effectiveDate: { $gte: period.start.toDate(), $lte: period.end.toDate() } },
        {
          $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: null },
            { expiryDate: { $gte: period.start.toDate() } }
          ]
        }
      ]
    };
    const [leaves, adjustments] = await Promise.all([
      Leave.find({ empID: employee.empID, leaveType: RETURN_TAIWAN_LEAVE_TYPE, status: 'approved', ...periodFilter }),
      LeaveAdjustment.find({ empID: employee.empID, leaveType: RETURN_TAIWAN_LEAVE_TYPE, ...adjustmentFilter })
    ]);
    const totalHours = entitlementDays * HOURS_PER_DAY + sumAdjustmentMinutes(adjustments) / 60;
    const usedHours = sumLeaveMinutes(leaves, period.start, period.end) / 60;

    return {
      eligible: true,
      totalDays: entitlementDays,
      totalHours,
      usedHours,
      remainingHours: totalHours - usedHours,
      leaves,
      adjustments
    };
  }

  static async assertRequestAllowed(employee: IEmployee, leaveStart: Dayjs, leaveEnd: Dayjs): Promise<void> {
    if (!employee.hireDate || !await this.isEligible(employee)) {
      throw new APIError('此員工職稱不適用返台假', 403);
    }

    let segmentStart = leaveStart;
    while (segmentStart.isBefore(leaveEnd)) {
      const period = this.getPeriod(employee.hireDate, segmentStart);
      const segmentEnd = leaveEnd.isBefore(period.end) ? leaveEnd : period.end;
      const requestedHours = calcWorkingDuration(segmentStart, segmentEnd, { useStandard4HourBlocks: true }).hourFormat;

      if (requestedHours > 0) {
        const balance = await this.getBalance(employee, segmentStart);
        if (balance.totalHours <= 0) {
          throw new APIError('到職未滿三個月，尚無返台假額度', 400);
        }

        if (requestedHours > balance.remainingHours) {
          throw new APIError(
            `返台假剩餘時數為 ${balance.remainingHours.toFixed(0)} 小時，無法申請 ${requestedHours.toFixed(0)} 小時`,
            400
          );
        }
      }

      segmentStart = period.end.add(1, 'millisecond');
    }
  }

  static async assertRequestAllowedForEmpID(empID: string, leaveStart: Dayjs, leaveEnd: Dayjs): Promise<void> {
    const employee = await Employee.findOne({ empID, isActive: true });
    if (!employee) {
      throw new APIError('Employee not found', 404);
    }
    await this.assertRequestAllowed(employee, dayjsToTz(leaveStart), dayjsToTz(leaveEnd));
  }
}
