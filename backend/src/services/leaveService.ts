import { Leave, ILeave, Employee, Attendance } from '../models';
import { APIError } from '../middleware/errorHandler';
import { calcWarkingDurent, isWeekend } from '../utility';

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

    const timeDiff = calcWarkingDurent(leaveData.leaveStart, leaveData.leaveEnd);
    const totalMinutes = Math.floor(timeDiff.durent);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    console.log(timeDiff)
    console.log(totalMinutes)
    console.log(hours)
    console.log(minutes)

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

  static async approveLeaveRequest(leaveId: string, approvedBy: string): Promise<ILeave> {
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

    const savedLeave = await leave.save();

    // Update related attendance records with leave sequenceNumber
    await this.updateAttendanceRecordsForLeave(leave);

    return savedLeave;
  }

  /**
   * Update attendance records for a leave period
   * Creates missing records and adds leave sequenceNumber to leaves array
   */
  private static async updateAttendanceRecordsForLeave(leave: ILeave): Promise<void> {
    const startDate = new Date(leave.leaveStart);
    const endDate = new Date(leave.leaveEnd);

    // Normalize to start of day for comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Get employee details for creating attendance records
    const employee = await Employee.findOne({ empID: leave.empID, isActive: true });
    if (!employee) {
      throw new APIError('Employee not found', 404);
    }

    // Generate all dates in the leave period
    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process each date
    for (const date of dates) {
      if (isWeekend(date)) {
        continue;
      }

      // Try to find existing attendance record
      let attendance = await Attendance.findOne({
        cardID: employee.cardID,
        date: date
      });

      if (attendance) {
        // Update existing record: add sequenceNumber to leaves array if not already present
        if (!attendance.leaves) {
          attendance.leaves = [];
        }

        if (!attendance.leaves.includes(leave.sequenceNumber)) {
          attendance.leaves.push(leave.sequenceNumber);
          await attendance.save();
        }
      } else {
        // Create new attendance record
        attendance = new Attendance({
          cardID: employee.cardID,
          employeeName: employee.name,
          department: employee.department,
          date: date,
          leaves: [leave.sequenceNumber],
          isAbsent: false // Mark as not absent since it's approved leave
        });
        await attendance.save();
      }
    }
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

  static async cancelLeaveRequest(leaveId: string, cancelledBy: string, reason?: string): Promise<ILeave> {
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      throw new APIError('Leave request not found', 404);
    }

    if (leave.status === 'cancel') {
      throw new APIError('Leave request already cancelled', 400);
    }

    // Allow cancelling from any state (created, approved, rejected) with reason
    // Update attendance records if cancelling an approved leave
    if (leave.status === 'approved') {
      await this.removeAttendanceRecordsForLeave(leave);
    }

    leave.status = 'cancel';
    leave.approvedBy = cancelledBy;
    if (reason) {
      leave.rejectionReason = reason; // Reuse rejectionReason field for cancel reason
    }

    return await leave.save();
  }

  /**
   * Remove attendance records for a cancelled leave period
   * Removes leave sequenceNumber from leaves array
   */
  private static async removeAttendanceRecordsForLeave(leave: ILeave): Promise<void> {
    const startDate = new Date(leave.leaveStart);
    const endDate = new Date(leave.leaveEnd);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const employee = await Employee.findOne({ empID: leave.empID, isActive: true });
    if (!employee) {
      return;
    }

    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const date of dates) {
      if (isWeekend(date)) {
        continue;
      }

      const attendance = await Attendance.findOne({
        cardID: employee.cardID,
        date: date
      });

      if (attendance && attendance.leaves) {
        // Remove sequenceNumber from leaves array
        attendance.leaves = attendance.leaves.filter(seq => seq !== leave.sequenceNumber);
        await attendance.save();
      }
    }
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
}