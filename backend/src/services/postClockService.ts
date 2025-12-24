import { PostClock, IPostClock, Employee } from '../models';
import { APIError } from '../middleware/errorHandler';

export class PostClockService {
  static async createPostClockRequest(empID: string, postClockData: {
    date: string;
    time: string;
    clockType: 'in' | 'out';
    reason: string;
    supportingInfo?: string[];
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
    // await this.updateAttendanceRecordForPostClock(postClock);

    return savedPostClock;
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
