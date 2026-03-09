import { Leave, ILeave, Employee, Attendance, LeaveAdjustment } from '../models';
import { APIError } from '../middleware/errorHandler';
import { isWeekend } from '../util/utility';
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
   * Calculate special leave entitlement in days based on hire date
   */
  private static calculateSpecialLeaveEntitlementDays(hireDate: Date): number {
    const now = new Date();
    const hireDateObj = new Date(hireDate);

    // Calculate months of service
    const monthsDiff = (now.getFullYear() - hireDateObj.getFullYear()) * 12 +
      (now.getMonth() - hireDateObj.getMonth());

    // Calculate years of service (including partial years)
    const yearsDiff = monthsDiff / 12;

    if (monthsDiff < 6) {
      return 0; // Less than 6 months
    } else if (yearsDiff < 1) {
      return 3; // 6 months to 1 year
    } else if (yearsDiff < 2) {
      return 7; // 1-2 years
    } else if (yearsDiff < 3) {
      return 10; // 2-3 years
    } else if (yearsDiff < 5) {
      return 14; // 3-5 years
    } else if (yearsDiff < 10) {
      return 15; // 5-10 years
    } else {
      // 10 years and above: 16 + (years - 10), max 30 days
      const additionalYears = Math.floor(yearsDiff) - 10;
      return Math.min(16 + additionalYears, 30);
    }
  }

  /**
   * Generate 請假總表 (Leave Summary Report) Excel for a given year
   * Columns: 員工編號, 姓名, 應休天數(特別休假 by day), 可休時數(特別休假 by hour), 事假(approved by hour), 病假(approved by hour)
   */
  static async generateLeaveSummaryReport(year: number): Promise<Buffer> {
    // Get all active employees
    const employees = await Employee.find({ isActive: true }).sort({ empID: 1 });

    // Get all approved leave requests for the year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const [allLeaves, allAdjustments] = await Promise.all([
      Leave.find({
        status: 'approved',
        $or: [
          { leaveStart: { $gte: yearStart, $lte: yearEnd } },
          { leaveEnd: { $gte: yearStart, $lte: yearEnd } },
          { leaveStart: { $lte: yearStart }, leaveEnd: { $gte: yearEnd } }
        ]
      }),
      LeaveAdjustment.find({})
    ]);

    // Build report data
    const reportData: any[] = [];

    for (const employee of employees) {
      // Filter leaves for this employee
      const empLeaves = allLeaves.filter(l => l.empID === employee.empID);
      const empAdjustments = allAdjustments.filter(a => a.empID === employee.empID);

      // Calculate special leave entitlement
      let specialLeaveDays = 0;
      let specialLeaveHours = 0;
      if (employee.hireDate) {
        specialLeaveDays = this.calculateSpecialLeaveEntitlementDays(employee.hireDate);
        // Add adjustments for special leave
        const specialAdjustments = empAdjustments.filter(a => a.leaveType === '特別休假');
        const adjustmentMinutes = specialAdjustments.reduce((sum, a) => sum + a.minutes, 0);
        specialLeaveHours = specialLeaveDays * 8 + (adjustmentMinutes / 60);
      }

      // Calculate used personal leave (事假) in hours
      const personalLeaves = empLeaves.filter(l => l.leaveType === '事假');
      const personalUsedMinutes = personalLeaves.reduce((sum, l) => {
        return sum + (parseInt(l.hour) * 60) + parseInt(l.minutes);
      }, 0);
      const personalUsedHours = personalUsedMinutes / 60;

      // Calculate used sick leave (普通傷病假) in hours
      const sickLeaves = empLeaves.filter(l => l.leaveType === '普通傷病假');
      const sickUsedMinutes = sickLeaves.reduce((sum, l) => {
        return sum + (parseInt(l.hour) * 60) + parseInt(l.minutes);
      }, 0);
      const sickUsedHours = sickUsedMinutes / 60;

      reportData.push({
        '員工編號': employee.empID,
        '姓名': employee.name,
        '應休天數': specialLeaveDays,
        '可休時數': Math.round(specialLeaveHours * 10) / 10,
        '事假': Math.round(personalUsedHours * 10) / 10,
        '病假': Math.round(sickUsedHours * 10) / 10
      });
    }

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '請假總表');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // 員工編號
      { wch: 12 }, // 姓名
      { wch: 12 }, // 應休天數
      { wch: 12 }, // 可休時數
      { wch: 10 }, // 事假
      { wch: 10 }  // 病假
    ];

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
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
}