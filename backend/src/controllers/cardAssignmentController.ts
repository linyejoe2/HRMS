import { Response } from 'express';
import { asyncHandler, AuthRequest } from '../middleware';
import { syncAttendanceMetadata } from '../services/syncAttendanceMetadataService';

export class CardAssignmentController {
  syncMetadata = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate, employeeId } = req.query;

    const result = await syncAttendanceMetadata({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      employeeId: employeeId as string | undefined
    });

    res.status(200).json({
      error: false,
      message: `Synced ${result.updated} of ${result.total} attendance records`,
      data: result
    });
  });
}

export const cardAssignmentController = new CardAssignmentController();
