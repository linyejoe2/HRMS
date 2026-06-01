import { Response } from 'express';
import { LegacyLeaveService } from '../services/legacyLeaveService';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getLegacyLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { empID } = req.params;
  const data = await LegacyLeaveService.getByEmpID(empID);
  res.json({ error: false, message: '成功取得歷史假別紀錄', data });
});

export const upsertLegacyLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { empID, month } = req.params;
  const { leaves } = req.body;
  const data = await LegacyLeaveService.upsertByMonth(empID, month, leaves);
  res.json({ error: false, message: '成功更新歷史假別紀錄', data });
});

export const deleteLegacyLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { empID, month } = req.params;
  await LegacyLeaveService.deleteByMonth(empID, month);
  res.json({ error: false, message: '成功刪除歷史假別紀錄', data: null });
});
