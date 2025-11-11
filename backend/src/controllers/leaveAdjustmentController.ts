import { Response } from 'express';
import { LeaveAdjustmentService } from '../services/leaveAdjustmentService';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const createLeaveAdjustment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { empID, leaveType, minutes, reason } = req.body;
  const createdBy = req.user!.empID;

  const adjustment = await LeaveAdjustmentService.createAdjustment({
    empID,
    leaveType,
    minutes,
    reason,
    createdBy
  });

  res.status(201).json({
    error: false,
    message: '假別調整已成功建立',
    data: adjustment
  });
});

export const getLeaveAdjustmentsByEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { empID } = req.params;
  const { leaveType } = req.query;

  const adjustments = await LeaveAdjustmentService.getAdjustmentsByEmployee(
    empID,
    leaveType as string | undefined
  );

  res.json({
    error: false,
    message: '成功取得假別調整紀錄',
    data: adjustments
  });
});

export const getAllLeaveAdjustments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const adjustments = await LeaveAdjustmentService.getAllAdjustments();

  res.json({
    error: false,
    message: '成功取得所有假別調整紀錄',
    data: adjustments
  });
});

export const deleteLeaveAdjustment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  await LeaveAdjustmentService.deleteAdjustment(id);

  res.json({
    error: false,
    message: '假別調整已刪除',
    data: null
  });
});
