import { Request, Response } from 'express';
import { attendanceService } from '../services';
import { asyncHandler, AuthRequest } from '../middleware';

export class AttendanceController {
  
  // Import attendance data for a specific date
  importByDate = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.params; // Expected format: YYYY-MM-DD
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        error: 'Invalid date format. Expected: YYYY-MM-DD'
      });
      return;
    }
    
    const result = await attendanceService.importAttendanceByDate(date);
    
    res.status(200).json({
      success: true,
      message: `Attendance data imported for ${date}`,
      data: result
    });
  });
  
  // Get attendance records for a specific date
  getByDate = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.params; // Expected format: YYYY-MM-DD
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        error: 'Invalid date format. Expected: YYYY-MM-DD'
      });
      return;
    }
    
    const records = await attendanceService.getAttendanceByDate(date);
    
    res.status(200).json({
      success: true,
      data: {
        date,
        count: records.length,
        records
      }
    });
  });
  
  // Get attendance records for an employee within a date range
  getEmployeeAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { empID } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!empID) {
      res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
      return;
    }
    
    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
      return;
    }
    
    const records = await attendanceService.getEmployeeAttendance(
      empID,
      startDate as string,
      endDate as string
    );
    
    res.status(200).json({
      success: true,
      data: {
        empID,
        startDate,
        endDate,
        count: records.length,
        records
      }
    });
  });
  
  // Get my attendance records (for logged-in employee)
  getMyAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    const empID = req.user?.empID;
    
    if (!empID) {
      res.status(401).json({
        success: false,
        error: 'Employee ID not found in token'
      });
      return;
    }
    
    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
      return;
    }
    
    const records = await attendanceService.getEmployeeAttendance(
      empID,
      startDate as string,
      endDate as string
    );
    
    res.status(200).json({
      success: true,
      data: {
        empID,
        startDate,
        endDate,
        count: records.length,
        records
      }
    });
  });
  
  // Get attendance summary for a date range
  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
      return;
    }
    
    const summary = await attendanceService.getAttendanceSummary(
      startDate as string,
      endDate as string
    );
    
    res.status(200).json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary
      }
    });
  });
}

export const attendanceController = new AttendanceController();