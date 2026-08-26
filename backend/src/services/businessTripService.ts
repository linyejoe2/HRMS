import { BusinessTrip, IBusinessTrip, Employee } from '../models';
import { APIError } from '../middleware/errorHandler';

export class BusinessTripService {
  static async createBusinessTripRequest(empID: string, businessTripData: {
    destination: string;
    purpose: string;
    tripStart: string;
    tripEnd: string;
    transportation?: string;
    estimatedCost?: number;
    notes?: string;
    supportingInfo?: string[];
  }): Promise<IBusinessTrip> {
    const employee = await Employee.findOne({ empID, isActive: true });
    if (!employee) {
      throw new APIError('Employee not found', 404);
    }

    const tripStart = new Date(businessTripData.tripStart);
    const tripEnd = new Date(businessTripData.tripEnd);

    // Validate dates
    if (tripEnd <= tripStart) {
      throw new APIError('Trip end date must be after start date', 400);
    }

    const businessTrip = new BusinessTrip({
      empID,
      name: employee.name,
      department: employee.department || '',
      destination: businessTripData.destination,
      purpose: businessTripData.purpose,
      tripStart,
      tripEnd,
      transportation: businessTripData.transportation,
      estimatedCost: businessTripData.estimatedCost,
      notes: businessTripData.notes,
      supportingInfo: businessTripData.supportingInfo,
      status: 'created'
    });

    const savedBusinessTrip = await businessTrip.save();

    return savedBusinessTrip;
  }

  static async getBusinessTripRequestsByEmployee(empID: string): Promise<IBusinessTrip[]> {
    return await BusinessTrip.find({ empID, status: { $ne: 'cancel' } }).sort({ createdAt: -1 });
  }

  static async getAllBusinessTripRequests(status?: string): Promise<IBusinessTrip[]> {
    const query = status ? { status } : { status: { $ne: 'cancel' } };
    return await BusinessTrip.find(query).sort({ createdAt: -1 });
  }

  static async approveBusinessTripRequest(businessTripId: string, approvedBy: string, supportingInfo?: string[]): Promise<IBusinessTrip> {
    const businessTrip = await BusinessTrip.findById(businessTripId);
    if (!businessTrip) {
      throw new APIError('Business trip request not found', 404);
    }

    if (businessTrip.status !== 'created') {
      throw new APIError('Business trip request already processed', 400);
    }

    businessTrip.status = 'approved';
    businessTrip.approvedBy = approvedBy;

    // Append new supporting files if provided
    if (supportingInfo && supportingInfo.length > 0) {
      businessTrip.supportingInfo = [...(businessTrip.supportingInfo || []), ...supportingInfo];
    }

    const savedBusinessTrip = await businessTrip.save();

    return savedBusinessTrip;
  }

  static async rejectBusinessTripRequest(businessTripId: string, rejectionReason: string, rejectedBy: string, supportingInfo?: string[]): Promise<IBusinessTrip> {
    const businessTrip = await BusinessTrip.findById(businessTripId);
    if (!businessTrip) {
      throw new APIError('Business trip request not found', 404);
    }

    if (businessTrip.status !== 'created') {
      throw new APIError('Business trip request already processed', 400);
    }

    businessTrip.status = 'rejected';
    businessTrip.rejectionReason = rejectionReason;
    businessTrip.approvedBy = rejectedBy;

    // Append new supporting files if provided
    if (supportingInfo && supportingInfo.length > 0) {
      businessTrip.supportingInfo = [...(businessTrip.supportingInfo || []), ...supportingInfo];
    }

    return await businessTrip.save();
  }

  static async managerApproveBusinessTripRequest(businessTripId: string, requesterEmpID: string, memo?: string): Promise<IBusinessTrip> {
    const businessTrip = await BusinessTrip.findById(businessTripId);
    if (!businessTrip) {
      throw new APIError('Business trip request not found', 404);
    }
    const ownerEmployee = await Employee.findOne({ empID: businessTrip.empID });
    if (!ownerEmployee?.manager || ownerEmployee.manager !== requesterEmpID) {
      throw new APIError('無權限：您不是此申請人的主管', 403);
    }
    if (businessTrip.managerApproveStatus !== 'pending') {
      throw new APIError('此申請已完成主管審核', 400);
    }
    if (businessTrip.status !== 'created') {
      throw new APIError('此申請已被人事/管理員處理', 400);
    }

    businessTrip.manager = requesterEmpID;
    businessTrip.managerApproveStatus = 'approved';
    businessTrip.managerMemo = memo;
    businessTrip.managerApproveAt = new Date();

    return await businessTrip.save();
  }

  static async managerRejectBusinessTripRequest(businessTripId: string, requesterEmpID: string, memo: string): Promise<IBusinessTrip> {
    const businessTrip = await BusinessTrip.findById(businessTripId);
    if (!businessTrip) {
      throw new APIError('Business trip request not found', 404);
    }
    const ownerEmployee = await Employee.findOne({ empID: businessTrip.empID });
    if (!ownerEmployee?.manager || ownerEmployee.manager !== requesterEmpID) {
      throw new APIError('無權限：您不是此申請人的主管', 403);
    }
    if (businessTrip.managerApproveStatus !== 'pending') {
      throw new APIError('此申請已完成主管審核', 400);
    }
    if (businessTrip.status !== 'created') {
      throw new APIError('此申請已被人事/管理員處理', 400);
    }

    businessTrip.manager = requesterEmpID;
    businessTrip.managerApproveStatus = 'rejected';
    businessTrip.managerMemo = memo;
    businessTrip.managerApproveAt = new Date();

    return await businessTrip.save();
  }

  static async getPendingManagerBusinessTripRequests(managerEmpID: string): Promise<IBusinessTrip[]> {
    const managedEmpIDs = (await Employee.find({ manager: managerEmpID }).select('empID')).map(e => e.empID);
    if (managedEmpIDs.length === 0) return [];
    return await BusinessTrip.find({ empID: { $in: managedEmpIDs }, managerApproveStatus: 'pending', status: 'created' }).sort({ createdAt: -1 });
  }

  static async getBusinessTripRequestById(businessTripId: string): Promise<IBusinessTrip> {
    const businessTrip = await BusinessTrip.findById(businessTripId);
    if (!businessTrip) {
      throw new APIError('Business trip request not found', 404);
    }

    return businessTrip;
  }

  static async cancelBusinessTripRequest(businessTripId: string, cancelledBy: string, reason?: string): Promise<IBusinessTrip> {
    const businessTrip = await BusinessTrip.findById(businessTripId);
    if (!businessTrip) {
      throw new APIError('Business trip request not found', 404);
    }

    if (businessTrip.status === 'cancel') {
      throw new APIError('Business trip request already cancelled', 400);
    }

    // Allow cancelling from any state (created, approved, rejected) with reason
    businessTrip.status = 'cancel';
    businessTrip.approvedBy = cancelledBy;
    if (reason) {
      businessTrip.rejectionReason = reason; // Reuse rejectionReason field for cancel reason
    }

    return await businessTrip.save();
  }

  static async getCancelBusinessTripRequests(employeeID?: string): Promise<IBusinessTrip[]> {
    const query = employeeID
      ? { empID: employeeID, status: 'cancel' }
      : { status: 'cancel' };

    return await BusinessTrip.find(query).sort({ createdAt: -1 });
  }

  static async getBusinessTripRequestBySequenceNumber(sequenceNumber: number): Promise<IBusinessTrip> {
    const businessTrip = await BusinessTrip.findOne({ sequenceNumber });
    if (!businessTrip) {
      throw new APIError('Business trip request not found', 404);
    }

    return businessTrip;
  }
}
