import { Leave, ILeave, Employee, Attendance, LeaveAdjustment, LegacyLeave, IEmployee } from '../models';
import { APIError } from '../middleware/errorHandler';
import { isWeekend, parseJSONfromFile } from '../util/utility';
import { calcWorkingDuration } from './workingTimeCalcService';
import * as XLSX from 'xlsx';

export type DurentObject = {
  minuteFormat: number;
  hourFormat: number
  crossBreaktime: number;
  crossNight: number;
  crossholiday: number;
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

    const leaveStart = new Date(leaveData.leaveStart);
    const leaveEnd = new Date(leaveData.leaveEnd);

    const timeDiff = calcWorkingDuration(leaveData.leaveStart, leaveData.leaveEnd, { useStandard4HourBlocks: true });

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
      leaveStart,
      leaveEnd,
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

  static async approveLeaveRequest(leaveId: string, approvedBy: string, supportingInfo?: string[]): Promise<ILeave> {
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
  private static calculateSpecialLeaveEntitlementDays(hireDate: Date, referenceDate?: Date): number {
    const ref = referenceDate ?? new Date();
    const hireDateObj = new Date(hireDate);

    const monthsDiff = (ref.getFullYear() - hireDateObj.getFullYear()) * 12 +
      (ref.getMonth() - hireDateObj.getMonth());

    const yearsDiff = monthsDiff / 12;

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

  static calcAnnualLeaveDaysByEmployee(employee: IEmployee, referenceDate: Date): [number, number, number, number] {
    const res: [number, number, number, number] = [0, 0, 0, 0]
    const lastYear = new Date(referenceDate.getTime());
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    res[0] = this.calculateSpecialLeaveEntitlementDays(employee.hireDate!, lastYear)
    res[1] = res[0] * 8
    res[2] = this.calculateSpecialLeaveEntitlementDays(employee.hireDate!, referenceDate)
    res[3] = res[2] * 8
    return res
  }



  /**
   * Generate 請假表 (Individual Employee Leave Report) Excel for a given employee and date range
   */
  static async generateEmployeeLeaveReport(empID: string, startDate: string, endDate: string): Promise<Buffer> {
    const employee = await Employee.findOne({ empID });
    if (!employee) {
      throw new APIError('Employee not found', 404);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all approved leave requests for this employee in the date range
    const leaves = await Leave.find({
      empID,
      status: 'approved',
      $or: [
        { leaveStart: { $gte: start, $lte: end } },
        { leaveEnd: { $gte: start, $lte: end } },
        { leaveStart: { $lte: start }, leaveEnd: { $gte: end } }
      ]
    }).sort({ leaveStart: 1 });

    // Build report data
    const reportData: any[] = leaves.map(leave => {
      const leaveStartDate = new Date(leave.leaveStart);
      const leaveEndDate = new Date(leave.leaveEnd);

      return {
        '請假類型': leave.leaveType,
        '開始時間': leaveStartDate.toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        '結束時間': leaveEndDate.toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        '時數': parseInt(leave.hour) + (parseInt(leave.minutes) / 60),
        '請假事由': leave.reason || '',
        '審核人': leave.approvedBy || ''
      };
    });

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();

    // Add header with employee info
    XLSX.utils.sheet_add_aoa(worksheet, [
      [`員工編號: ${employee.empID}`, `姓名: ${employee.name}`, `部門: ${employee.department || ''}`],
      [`查詢期間: ${startDate} ~ ${endDate}`],
      [] // Empty row
    ], { origin: 'A1' });

    // Re-add the data starting from row 4
    XLSX.utils.sheet_add_json(worksheet, reportData, { origin: 'A4', skipHeader: false });

    XLSX.utils.book_append_sheet(workbook, worksheet, '請假表');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // 請假類型
      { wch: 20 }, // 開始時間
      { wch: 20 }, // 結束時間
      { wch: 8 },  // 時數
      { wch: 30 }, // 請假事由
      { wch: 12 }  // 審核人
    ];

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  static getYearRanges(hireDate?: Date, referenceDate?: Date) {
    if (!hireDate || !referenceDate) return {
      lastYearStart: '',
      lastYearEnd: '',
      thisYearStart: '',
      thisYearEnd: ''
    }
    const hireMonth = hireDate.getMonth(); // 0-11
    const hireDay = hireDate.getDate();
    const baseYear = referenceDate.getFullYear();

    // 建立一個與 referenceDate 同一年的入職週年基準點
    let thisYearStart = new Date(baseYear, hireMonth, hireDay);

    // 根據你的範例：referenceDate (2025/01/01) 時，thisYearStart 是 2025/10/01
    // 如果你的邏輯是「不管 referenceDate 在幾月，thisYearStart 都強制設定為 referenceDate 當年的入職月日」：
    // 那就直接以此為基準。若 referenceDate 已經過了當年的入職日，需要視需求調整（目前完全符合你範例的邏輯）。

    // 計算各個日期物件
    let thisStart = new Date(thisYearStart);

    let thisEnd = new Date(thisStart);
    thisEnd.setFullYear(thisEnd.getFullYear() + 1);
    thisEnd.setDate(thisEnd.getDate() - 1); // 減一天得到結束日

    let lastStart = new Date(thisStart);
    lastStart.setFullYear(lastStart.getFullYear() - 1);

    let lastEnd = new Date(thisStart);
    lastEnd.setDate(lastEnd.getDate() - 1);

    // 格式化輸出成 YYYY/MM/DD
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}/${m}/${d}`;
    };

    return {
      lastYearStart: formatDate(lastStart),
      lastYearEnd: formatDate(lastEnd),
      thisYearStart: formatDate(thisStart),
      thisYearEnd: formatDate(thisEnd)
    };
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

    const parseChineseDate = (year: string, dateStr: string): Date | null => {
      const match = dateStr.match(/(\d+)月(\d+)日/);
      if (!match) return null;
      return new Date(parseInt(year), parseInt(match[1]) - 1, parseInt(match[2]), 9, 0, 0, 0);
    };

    for (let i = 0; i < records.length; i++) {
      const { empID, leaveType, reason, year, leaveStart: startStr, hour } = records[i];
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

        const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000);
        const wholeHours = Math.floor(hours);
        const minutes   = Math.round((hours - wholeHours) * 60);

        await Leave.create({
          empID,
          name:       employee.name,
          department: employee.department || '',
          leaveType,
          reason:     reason || '',
          leaveStart: startDate,
          leaveEnd:   endDate,
          YYYY:       String(startDate.getFullYear()),
          mm:         String(startDate.getMonth() + 1).padStart(2, '0'),
          DD:         String(startDate.getDate()).padStart(2, '0'),
          hour:       String(wholeHours),
          minutes:    String(minutes),
          status:     'approved'
        });

        imported++;
      } catch (err: any) {
        errors.push({ index: i, empID, message: err.message || '未知錯誤' });
      }
    }

    return { imported, errors };
  }
}