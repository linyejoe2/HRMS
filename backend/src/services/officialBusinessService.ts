import { OfficialBusiness, IOfficialBusiness } from '../models/OfficialBusiness';
import { Employee } from '../models';
import { APIError } from '../middleware';

export class OfficialBusinessService {
  /**
   * Create a new official business request
   */
  static async createOfficialBusinessRequest(
    applicant: string,
    officialBusinessData: {
      empIDs: string[];
      licensePlate: string;
      startTime: string;
      endTime: string;
      purpose: string;
      supportingInfo?: string[];
    }
  ): Promise<IOfficialBusiness> {
    // Validate applicant exists and is active
    const applicantEmployee = await Employee.findOne({ empID: applicant, isActive: true });
    if (!applicantEmployee) {
      throw new APIError('申請人不存在或已停用', 404);
    }

    // Validate all participant employees exist
    const participants = await Employee.find({
      empID: { $in: officialBusinessData.empIDs },
      isActive: true
    });

    if (participants.length !== officialBusinessData.empIDs.length) {
      throw new APIError('部分參與人員不存在或已停用', 400);
    }

    // Validate time range
    const startTime = new Date(officialBusinessData.startTime);
    const endTime = new Date(officialBusinessData.endTime);

    if (endTime <= startTime) {
      throw new APIError('返回時間必須晚於外出時間', 400);
    }

    // Create participant names array from employee data
    const participantNames = participants.map(emp => emp.name);

    // Create the official business request
    const officialBusiness = new OfficialBusiness({
      applicant,
      applicantName: applicantEmployee.name,
      empIDs: officialBusinessData.empIDs,
      participantNames,
      licensePlate: officialBusinessData.licensePlate,
      startTime,
      endTime,
      purpose: officialBusinessData.purpose,
      supportingInfo: officialBusinessData.supportingInfo || [],
      status: 'created'
    });

    return officialBusiness.save();
  }

  /**
   * Get official business requests by employee (as applicant or participant)
   */
  static async getOfficialBusinessRequestsByEmployee(empID: string): Promise<IOfficialBusiness[]> {
    return OfficialBusiness.find({
      $and: [
        {
          $or: [
            { applicant: empID },
            { empIDs: empID }
          ]
        },
        { status: { $ne: 'cancel' } }
      ]
    }).sort({ startTime: -1 });
  }

  /**
   * Get all official business requests (optionally filtered by status)
   */
  static async getAllOfficialBusinessRequests(status?: string): Promise<IOfficialBusiness[]> {
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    return OfficialBusiness.find(filter).sort({ startTime: -1 });
  }

  /**
   * Get official business request by ID
   */
  static async getOfficialBusinessRequestById(officialBusinessId: string): Promise<IOfficialBusiness> {
    const officialBusiness = await OfficialBusiness.findById(officialBusinessId);

    if (!officialBusiness) {
      throw new APIError('找不到該外出申請', 404);
    }

    return officialBusiness;
  }

  /**
   * Get official business request by sequence number
   */
  static async getOfficialBusinessRequestBySequenceNumber(sequenceNumber: number): Promise<IOfficialBusiness> {
    const officialBusiness = await OfficialBusiness.findOne({ sequenceNumber });

    if (!officialBusiness) {
      throw new APIError('找不到該外出申請', 404);
    }

    return officialBusiness;
  }

  /**
   * Approve official business request
   */
  static async approveOfficialBusinessRequest(
    officialBusinessId: string,
    approvedBy: string,
    supportingInfo?: string[]
  ): Promise<IOfficialBusiness> {
    const officialBusiness = await OfficialBusiness.findById(officialBusinessId);

    if (!officialBusiness) {
      throw new APIError('找不到該外出申請', 404);
    }

    if (officialBusiness.status !== 'created') {
      throw new APIError('只能核准待審核的申請', 400);
    }

    officialBusiness.status = 'approved';
    officialBusiness.approvedBy = approvedBy;

    // Append new supporting files if provided
    if (supportingInfo && supportingInfo.length > 0) {
      officialBusiness.supportingInfo = [...(officialBusiness.supportingInfo || []), ...supportingInfo];
    }

    return officialBusiness.save();
  }

  /**
   * Reject official business request
   */
  static async rejectOfficialBusinessRequest(
    officialBusinessId: string,
    rejectionReason: string,
    rejectedBy: string,
    supportingInfo?: string[]
  ): Promise<IOfficialBusiness> {
    const officialBusiness = await OfficialBusiness.findById(officialBusinessId);

    if (!officialBusiness) {
      throw new APIError('找不到該外出申請', 404);
    }

    if (officialBusiness.status !== 'created') {
      throw new APIError('只能拒絕待審核的申請', 400);
    }

    officialBusiness.status = 'rejected';
    officialBusiness.rejectionReason = rejectionReason;
    officialBusiness.approvedBy = rejectedBy;

    // Append new supporting files if provided
    if (supportingInfo && supportingInfo.length > 0) {
      officialBusiness.supportingInfo = [...(officialBusiness.supportingInfo || []), ...supportingInfo];
    }

    return officialBusiness.save();
  }

  /**
   * Cancel official business request
   */
  static async cancelOfficialBusinessRequest(
    officialBusinessId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<IOfficialBusiness> {
    const officialBusiness = await OfficialBusiness.findById(officialBusinessId);

    if (!officialBusiness) {
      throw new APIError('找不到該外出申請', 404);
    }

    if (officialBusiness.status === 'cancel') {
      throw new APIError('該申請已經被取消', 400);
    }

    officialBusiness.status = 'cancel';
    officialBusiness.approvedBy = cancelledBy;

    if (reason) {
      officialBusiness.rejectionReason = reason;
    }

    return officialBusiness.save();
  }

  /**
   * Get cancelled official business requests
   */
  static async getCancelledOfficialBusinessRequests(empID?: string): Promise<IOfficialBusiness[]> {
    const filter: any = { status: 'cancel' };

    if (empID) {
      filter.$or = [
        { applicant: empID },
        { empIDs: empID }
      ];
    }

    return OfficialBusiness.find(filter).sort({ startTime: -1 });
  }
}

export const officialBusinessService = OfficialBusinessService;
