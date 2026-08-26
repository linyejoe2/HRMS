import dayjs from 'dayjs';
import { PostClock, IPostClock, Employee } from '../models';
import { APIError } from '../middleware/errorHandler';

export class PostClockService {
  static async createPostClockRequest(empID: string, postClockData: {
    date: string;
    time: string;
    date2?: string;
    time2?: string;
    clockType: 'in' | 'out' | 'in&out';
    reason: string;
    supportingInfo?: string[];
    agent?: string;
    rejectionReason?: string;
  }): Promise<IPostClock> {
    const employee = await Employee.findOne({ empID, isActive: true });
    if (!employee) {
      throw new APIError('Employee not found', 404);
    }

    const date = dayjs(postClockData.date).toDate();
    const time = dayjs(postClockData.time).toDate();

    if (postClockData.clockType === 'in&out' && (!postClockData.date2 || !postClockData.time2)) {
      throw new APIError('date2 and time2 are required when clockType is in&out', 400);
    }

    const date2 = postClockData.date2 ? dayjs(postClockData.date2).toDate() : undefined;
    const time2 = postClockData.time2 ? dayjs(postClockData.time2).toDate() : undefined;

    const postClock = new PostClock({
      empID,
      name: employee.name,
      department: employee.department || '',
      date,
      time,
      date2,
      time2,
      clockType: postClockData.clockType,
      reason: postClockData.reason,
      supportingInfo: postClockData.supportingInfo,
      status: 'created',
      agent: postClockData.agent,
      rejectionReason: postClockData.rejectionReason
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

  static async approvePostClockRequest(postClockId: string, approvedBy: string, supportingInfo?: string[]): Promise<IPostClock> {
    const postClock = await PostClock.findById(postClockId);
    if (!postClock) {
      throw new APIError('PostClock request not found', 404);
    }

    if (postClock.status !== 'created') {
      throw new APIError('PostClock request already processed', 400);
    }

    postClock.status = 'approved';
    postClock.approvedBy = approvedBy;

    // Append new supporting files if provided
    if (supportingInfo && supportingInfo.length > 0) {
      postClock.supportingInfo = [...(postClock.supportingInfo || []), ...supportingInfo];
    }

    const savedPostClock = await postClock.save();

    // Update related attendance record with postclock sequenceNumber
    // await this.updateAttendanceRecordForPostClock(postClock);

    return savedPostClock;
  }



  static async rejectPostClockRequest(postClockId: string, rejectionReason: string, rejectedBy: string, supportingInfo?: string[]): Promise<IPostClock> {
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

    // Append new supporting files if provided
    if (supportingInfo && supportingInfo.length > 0) {
      postClock.supportingInfo = [...(postClock.supportingInfo || []), ...supportingInfo];
    }

    return await postClock.save();
  }

  static async managerApprovePostClockRequest(postClockId: string, requesterEmpID: string, memo?: string): Promise<IPostClock> {
    const postClock = await PostClock.findById(postClockId);
    if (!postClock) {
      throw new APIError('PostClock request not found', 404);
    }
    const ownerEmployee = await Employee.findOne({ empID: postClock.empID });
    if (!ownerEmployee?.manager || ownerEmployee.manager !== requesterEmpID) {
      throw new APIError('無權限：您不是此申請人的主管', 403);
    }
    if (postClock.managerApproveStatus !== 'pending') {
      throw new APIError('此申請已完成主管審核', 400);
    }
    if (postClock.status !== 'created') {
      throw new APIError('此申請已被人事/管理員處理', 400);
    }

    postClock.manager = requesterEmpID;
    postClock.managerApproveStatus = 'approved';
    postClock.managerMemo = memo;
    postClock.managerApproveAt = new Date();

    return await postClock.save();
  }

  static async managerRejectPostClockRequest(postClockId: string, requesterEmpID: string, memo: string): Promise<IPostClock> {
    const postClock = await PostClock.findById(postClockId);
    if (!postClock) {
      throw new APIError('PostClock request not found', 404);
    }
    const ownerEmployee = await Employee.findOne({ empID: postClock.empID });
    if (!ownerEmployee?.manager || ownerEmployee.manager !== requesterEmpID) {
      throw new APIError('無權限：您不是此申請人的主管', 403);
    }
    if (postClock.managerApproveStatus !== 'pending') {
      throw new APIError('此申請已完成主管審核', 400);
    }
    if (postClock.status !== 'created') {
      throw new APIError('此申請已被人事/管理員處理', 400);
    }

    postClock.manager = requesterEmpID;
    postClock.managerApproveStatus = 'rejected';
    postClock.managerMemo = memo;
    postClock.managerApproveAt = new Date();

    return await postClock.save();
  }

  static async getPendingManagerPostClockRequests(managerEmpID: string): Promise<IPostClock[]> {
    const managedEmpIDs = (await Employee.find({ manager: managerEmpID }).select('empID')).map(e => e.empID);
    if (managedEmpIDs.length === 0) return [];
    return await PostClock.find({ empID: { $in: managedEmpIDs }, managerApproveStatus: 'pending', status: 'created' }).sort({ createdAt: -1 });
  }

  static async getPostClockRequestById(postClockId: string): Promise<IPostClock> {
    const postClock = await PostClock.findById(postClockId);
    if (!postClock) {
      throw new APIError('PostClock request not found', 404);
    }

    return postClock;
  }

  static async cancelPostClockRequest(postClockId: string, cancelledBy: string, reason?: string): Promise<IPostClock> {
    const postClock = await PostClock.findById(postClockId);
    if (!postClock) {
      throw new APIError('PostClock request not found', 404);
    }

    if (postClock.status === 'cancel') {
      throw new APIError('PostClock request already cancelled', 400);
    }

    postClock.status = 'cancel';
    postClock.approvedBy = cancelledBy;
    if (reason) {
      postClock.rejectionReason = reason; // Reuse rejectionReason field for cancel reason
    }

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
