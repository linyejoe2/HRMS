import { Leave, ILeave, Employee } from '../models';
import { APIError } from '../middleware/errorHandler';

export class LeaveService {
  static async createLeaveRequest(empID: string, leaveData: {
    leaveType: string;
    reason: string;
    leaveStart: string;
    leaveEnd: string;
  }): Promise<ILeave> {
    const employee = await Employee.findOne({ empID, isActive: true });
    if (!employee) {
      throw new APIError('Employee not found', 404);
    }

    const leaveStart = new Date(leaveData.leaveStart);
    const leaveEnd = new Date(leaveData.leaveEnd);

    const timeDiff = leaveEnd.getTime() - leaveStart.getTime();
    const totalMinutes = Math.floor(timeDiff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const createdDate = new Date();
    const YY = String(createdDate.getFullYear()).slice(-2);
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
      YY,
      mm,
      DD,
      hour: String(hours),
      minutes: String(minutes),
      status: 'created'
    });

    return await leave.save();
  }

  static async getLeaveRequestsByEmployee(empID: string): Promise<ILeave[]> {
    return await Leave.find({ empID }).sort({ createdAt: -1 });
  }

  static async getAllLeaveRequests(status?: string): Promise<ILeave[]> {
    const query = status ? { status } : {};
    return await Leave.find(query).sort({ createdAt: -1 });
  }

  static async approveLeaveRequest(leaveId: string, approvedBy: string): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }

    if (leave.status !== 'created') {
      throw new APIError('Leave request already processed', 400);
    }

    leave.status = 'approved';
    leave.approvedBy = approvedBy;

    return await leave.save();
  }

  static async rejectLeaveRequest(leaveId: string, rejectionReason: string, rejectedBy: string): Promise<ILeave> {
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

    return await leave.save();
  }

  static async getLeaveRequestById(leaveId: string): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }

    return leave;
  }
}