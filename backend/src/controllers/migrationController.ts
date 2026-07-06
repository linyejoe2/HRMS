import { Request, Response } from 'express';
import { migrationService } from '../services';
import { LeaveService } from '../services/leaveService';
import { asyncHandler } from '../middleware';

export class MigrationController {
  migrateFromAccess = asyncHandler(async (req: Request, res: Response) => {
    const result = await migrationService.migrateEmployeesFromAccess();
    
    res.status(200).json({
      error: false,
      message: '資料遷移完成',
      data: result
    });
  });

  getAccessEmployeeCount = asyncHandler(async (req: Request, res: Response) => {
    const count = await migrationService.getAccessEmployeeCount();
    
    res.status(200).json({
      error: false,
      message: '已成功取得員工數量',
      data: { count }
    });
  });

  testAccessConnection = asyncHandler(async (req: Request, res: Response) => {
    const isConnected = await migrationService.testAccessConnection();

    res.status(200).json({
      error: false,
      message: '已測試連線',
      data: { connected: isConnected }
    });
  });

  fixMissingLeaveEndDates = asyncHandler(async (req: Request, res: Response) => {
    const dryRun = req.query.dryRun === 'true';
    const result = await LeaveService.fixMissingLeaveEndDates(dryRun);

    res.status(200).json({
      error: false,
      message: dryRun ? '已模擬計算（未寫入資料庫）' : '請假結束日期修正完成',
      data: result
    });
  });
}

export const migrationController = new MigrationController();