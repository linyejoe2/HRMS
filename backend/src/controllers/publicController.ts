import { Request, Response } from 'express';
import { LeaveService } from '../services/leaveService';
import { asyncHandler } from '../middleware/errorHandler';

export const getPublicLeaveRecords = asyncHandler(async (req: Request, res: Response) => {
  const { empID } = req.params;
  const { year, month } = req.body;

  const records = await LeaveService.getSalaryPeriodLeaveHours(empID, Number(year), Number(month));

  res.json(records);
});
