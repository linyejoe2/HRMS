import { Request, Response } from 'express';
import { LeaveService } from '../services/leaveService';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const createLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  // return res.status(400).json({success: false, message: "測試失敗"})
  const { leaveType, reason, leaveStart, leaveEnd } = req.body;
  const empID = req.user!.empID;

  const leave = await LeaveService.createLeaveRequest(empID, {
    leaveType,
    reason,
    leaveStart,
    leaveEnd
  });

  res.status(201).json({
    success: true,
    data: leave,
    message: 'Leave request created successfully'
  });
});

export const getMyLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const empID = req.user!.empID;
  const leaves = await LeaveService.getLeaveRequestsByEmployee(empID);

  res.json({
    success: true,
    data: leaves,
    message: 'Leave requests retrieved successfully'
  });
});

export const getAllLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const leaves = await LeaveService.getAllLeaveRequests(status as string);

  res.json({
    success: true,
    data: leaves,
    message: 'All leave requests retrieved successfully'
  });
});

export const approveLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const approvedBy = req.user!.empID;

  const leave = await LeaveService.approveLeaveRequest(id, approvedBy);

  res.json({
    success: true,
    data: leave,
    message: 'Leave request approved successfully'
  });
});

export const rejectLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const rejectedBy = req.user!.empID;

  const leave = await LeaveService.rejectLeaveRequest(id, reason, rejectedBy);

  res.json({
    success: true,
    data: leave,
    message: 'Leave request rejected successfully'
  });
});

export const getLeaveRequestById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const leave = await LeaveService.getLeaveRequestById(id);

  res.json({
    success: true,
    data: leave,
    message: 'Leave request retrieved successfully'
  });
});