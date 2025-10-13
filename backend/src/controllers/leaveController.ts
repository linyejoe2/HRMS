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
    error: false,
    message: '請假申請已成功建立',
    data: leave
  });
});

export const getMyLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const empID = req.user!.empID;
  const leaves = await LeaveService.getLeaveRequestsByEmployee(empID);

  res.json({
    error: false,
    message: '已成功取得請假紀錄',
    data: leaves
  });
});

export const getAllLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const leaves = await LeaveService.getAllLeaveRequests(status as string);

  res.json({
    error: false,
    message: '成功取得所有請假紀錄',
    data: leaves
  });
});

export const approveLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const approvedBy = req.user!.empID;

  const leave = await LeaveService.approveLeaveRequest(id, approvedBy);

  res.json({
    error: false,
    message: '請假申請已核准',
    data: leave
  });
});

export const rejectLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const rejectedBy = req.user!.empID;

  const leave = await LeaveService.rejectLeaveRequest(id, reason, rejectedBy);

  res.json({
    error: false,
    message: '請假申請已駁回',
    data: leave
  });
});

export const getLeaveRequestById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const leave = await LeaveService.getLeaveRequestById(id);

  res.json({
    error: false,
    message: '成功取得請假紀錄',
    data: leave
  });
});

export const cancelLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const cancelledBy = req.user!.empID;

  const leave = await LeaveService.cancelLeaveRequest(id, cancelledBy);

  res.json({
    error: false,
    message: '請假申請已取消',
    data: leave
  });
});

export const getCancelLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { employeeID } = req.query;
  const leaves = await LeaveService.getCancelLeaveRequests(employeeID as string);

  res.json({
    error: false,
    message: '成功取得已取消的請假紀錄',
    data: leaves
  });
});