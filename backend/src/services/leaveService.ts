import { Leave, ILeave, Employee, Attendance } from '../models';
import { APIError } from '../middleware/errorHandler';
import { isWeekend } from '../util/utility';
import { calcWorkingDuration } from './workingTimeCalcService';

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
}