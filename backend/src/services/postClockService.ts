import { PostClock, IPostClock, Employee, Attendance } from '../models';
import { APIError } from '../middleware/errorHandler';
import { calcWarkingDurent } from '../utility';
import { calcWorkDuration } from './attendanceService';

export class PostClockService {
  static async createPostClockRequest(empID: string, postClockData: {
    date: string;
    time: string;
    clockType: 'in' | 'out';
    reason: string;
    supportingInfo?: string;
  }): Promise<IPostClock> {
    const employee = await Employee.findOne({ empID, isActive: true });
    if (!employee) {
      throw new APIError('Employee not found', 404);
    }

    const date = new Date(postClockData.date);
    const time = new Date(postClockData.time);

    const postClock = new PostClock({
      empID,
      name: employee.name,
      department: employee.department || '',
      date,
      time,
      clockType: postClockData.clockType,
      reason: postClockData.reason,
      supportingInfo: postClockData.supportingInfo,
      status: 'created'
    });

    const savedPostClock = await postClock.save();

    return savedPostClock;
  }

  static async getPostClockRequestsByEmployee(empID: string): Promise<IPostClock[]> {
    return await PostClock.find({ empID, status: { $ne: 'cancel' } }).sort({ createdAt: -1 });
  }

  static async getAllPostClockRequests(status?: string): Promise<IPostClock[]> {
    const query = status ? { status } : { status: { $ne: 'cancel' } };
    return await PostClock.find(query).sort({ createdAt: -1 });
  }

  static async approvePostClockRequest(postClockId: string, approvedBy: string): Promise<IPostClock> {
    const postClock = await PostClock.findById(postClockId);
    if (!postClock) {
      throw new APIError('PostClock request not found', 404);
    }

    if (postClock.status !== 'created') {
      throw new APIError('PostClock request already processed', 400);
    }

    postClock.status = 'approved';
    postClock.approvedBy = approvedBy;

    const savedPostClock = await postClock.save();

    // Update related attendance record with postclock sequenceNumber
    await this.updateAttendanceRecordForPostClock(postClock);

    return savedPostClock;
  }

  /**
   * Update attendance record for a postclock request
   * Creates missing record if needed and adds postclock sequenceNumber to postclocks array
   */
  private static async updateAttendanceRecordForPostClock(postClock: IPostClock): Promise<void> {
    const date = new Date(postClock.date);
    date.setHours(0, 0, 0, 0);

    // Get employee details
    const employee = await Employee.findOne({ empID: postClock.empID, isActive: true });
    if (!employee) {
      throw new APIError('Employee not found', 404);
    }

    // Try to find existing attendance record
    let attendance = await Attendance.findOne({
      cardID: employee.cardID,
      date: date
    });

    if (attendance) {
      // Update existing record: add sequenceNumber to postclocks array if not already present
      if (!attendance.postclocks) {
        attendance.postclocks = [];
      }

      if (!attendance.postclocks.includes(postClock.sequenceNumber)) {
        attendance.postclocks.push(postClock.sequenceNumber);
      }

      // Update clock in/out time based on clockType
      if (postClock.clockType === 'in') {
        attendance.clockInTime = postClock.time;
        attendance.clockInStatus = '補卡'; // Mark as manual entry
      } else {
        attendance.clockOutTime = postClock.time;
        attendance.clockOutStatus = '補卡'; // Mark as manual entry
      }

      if (attendance.clockInTime && attendance.clockOutTime) {
        const workDurationObj = calcWorkDuration(attendance.clockInTime, attendance.clockOutTime)

        attendance.workDuration = workDurationObj.duration
        attendance.lateMinute = workDurationObj.lateMinute
        attendance.isLate = workDurationObj.isLate
        attendance.isEarlyLeave = workDurationObj.isEarlyLeave
      }

      // Check if absent (no clock in by end of day)
      if (!attendance.clockInTime || !attendance.clockOutTime){
        attendance.isAbsent = true
      } else {
        attendance.isAbsent = false
      }

      await attendance.save();
    } else {
      // Create new attendance record
      const newAttendance: any = {
        cardID: employee.cardID,
        employeeName: employee.name,
        department: employee.department,
        date: date,
        postclocks: [postClock.sequenceNumber],
        isAbsent: false
      };

      // Set clock in/out time based on clockType
      if (postClock.clockType === 'in') {
        newAttendance.clockInTime = postClock.time;
        newAttendance.clockInStatus = '補卡'; // Mark as manual entry
      } else {
        newAttendance.clockOutTime = postClock.time;
        newAttendance.clockOutStatus = '補卡'; // Mark as manual entry
      }

      attendance = new Attendance(newAttendance);
      await attendance.save();
    }
  }

  static async rejectPostClockRequest(postClockId: string, rejectionReason: string, rejectedBy: string): Promise<IPostClock> {
    const postClock = await PostClock.findById(postClockId);
    if (!postClock) {
      throw new APIError('PostClock request not found', 404);
    }

    if (postClock.status !== 'created') {
      throw new APIError('PostClock request already processed', 400);
    }

    postClock.status = 'rejected';
    postClock.rejectionReason = rejectionReason;
    postClock.approvedBy = rejectedBy;

    return await postClock.save();
  }

  static async getPostClockRequestById(postClockId: string): Promise<IPostClock> {
    const postClock = await PostClock.findById(postClockId);
    if (!postClock) {
      throw new APIError('PostClock request not found', 404);
    }

    return postClock;
  }

  static async cancelPostClockRequest(postClockId: string, cancelledBy: string): Promise<IPostClock> {
    const postClock = await PostClock.findById(postClockId);
    if (!postClock) {
      throw new APIError('PostClock request not found', 404);
    }

    if (postClock.status === 'cancel') {
      throw new APIError('PostClock request already cancelled', 400);
    }

    if (postClock.status === 'approved') {
      throw new APIError('Cannot cancel approved postclock request', 400);
    }

    postClock.status = 'cancel';
    postClock.approvedBy = cancelledBy;

    return await postClock.save();
  }

  static async getCancelPostClockRequests(employeeID?: string): Promise<IPostClock[]> {
    const query = employeeID
      ? { empID: employeeID, status: 'cancel' }
      : { status: 'cancel' };

    return await PostClock.find(query).sort({ createdAt: -1 });
  }

  static async getPostClockRequestBySequenceNumber(sequenceNumber: number): Promise<IPostClock> {
    const postClock = await PostClock.findOne({ sequenceNumber });
    if (!postClock) {
      throw new APIError('PostClock request not found', 404);
    }

    return postClock;
  }
}
