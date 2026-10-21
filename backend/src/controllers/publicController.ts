import { Request, Response } from 'express';
import { LeaveService } from '../services/leaveService';
import { asyncHandler } from '../middleware/errorHandler';
import { dayjsToTz } from '../util/utility';

export const getPublicLeaveRecords = asyncHandler(async (req: Request, res: Response) => {
  const { empID } = req.params;
  const { year, month } = req.body;

  const records = await LeaveService.getSalaryPeriodLeaveHours(empID, Number(year), Number(month));

  res.json(records);
});

export const getPublicLeaveRecordsByRange = asyncHandler(async (req: Request, res: Response) => {
  const { empID } = req.params;
  const { startDate, endDate } = req.body;

  const records = await LeaveService.getLeaveHoursByDateRange(empID, dayjsToTz(startDate), dayjsToTz(endDate));

  res.json(records);
});
