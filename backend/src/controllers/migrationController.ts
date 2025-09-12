import { Request, Response } from 'express';
import { migrationService } from '../services';
import { asyncHandler } from '../middleware';

export class MigrationController {
  migrateFromAccess = asyncHandler(async (req: Request, res: Response) => {
    const result = await migrationService.migrateEmployeesFromAccess();
    
    res.status(200).json({
      success: true,
      message: 'Migration completed',
      data: result
    });
  });

  getAccessEmployeeCount = asyncHandler(async (req: Request, res: Response) => {
    const count = await migrationService.getAccessEmployeeCount();
    
    res.status(200).json({
      success: true,
      data: { count }
    });
  });

  testAccessConnection = asyncHandler(async (req: Request, res: Response) => {
    const isConnected = await migrationService.testAccessConnection();
    
    res.status(200).json({
      success: true,
      data: { connected: isConnected }
    });
  });
}

export const migrationController = new MigrationController();