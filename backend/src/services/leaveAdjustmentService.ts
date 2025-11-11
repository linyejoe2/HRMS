import { LeaveAdjustment, ILeaveAdjustment, Employee } from '../models';
import { APIError } from '../middleware/errorHandler';

interface CreateAdjustmentInput {
  empID: string;
  leaveType: string;
  minutes: number;
  reason: string;
  createdBy: string;
}

export class LeaveAdjustmentService {
  /**
   * Create a new leave adjustment
   */
  static async createAdjustment(data: CreateAdjustmentInput): Promise<ILeaveAdjustment> {
    // Verify employee exists
    const employee = await Employee.findOne({ empID: data.empID });
    if (!employee) {
      throw new APIError('找不到該員工', 404);
    }

    // Create adjustment
    const adjustment = await LeaveAdjustment.create({
      empID: data.empID,
      name: employee.name,
      department: employee.department || '',
      leaveType: data.leaveType,
      minutes: data.minutes,
      reason: data.reason,
      createdBy: data.createdBy
    });

    return adjustment;
  }

  /**
   * Get adjustments by employee ID and optionally filter by leave type
   */
  static async getAdjustmentsByEmployee(
    empID: string,
    leaveType?: string
  ): Promise<ILeaveAdjustment[]> {
    const query: any = { empID };
    if (leaveType) {
      query.leaveType = leaveType;
    }

    const adjustments = await LeaveAdjustment.find(query).sort({ createdAt: -1 });
    return adjustments;
  }

  /**
   * Get all leave adjustments
   */
  static async getAllAdjustments(): Promise<ILeaveAdjustment[]> {
    const adjustments = await LeaveAdjustment.find().sort({ createdAt: -1 });
    return adjustments;
  }

  /**
   * Delete a leave adjustment by ID
   */
  static async deleteAdjustment(id: string): Promise<void> {
    const adjustment = await LeaveAdjustment.findById(id);
    if (!adjustment) {
      throw new APIError('找不到該調整紀錄', 404);
    }

    await LeaveAdjustment.findByIdAndDelete(id);
  }

  /**
   * Calculate total adjustment minutes for an employee and leave type
   */
  static async getTotalAdjustmentMinutes(empID: string, leaveType: string): Promise<number> {
    const adjustments = await LeaveAdjustment.find({ empID, leaveType });
    return adjustments.reduce((total, adj) => total + adj.minutes, 0);
  }
}
