import { Request, Response } from 'express';
import { attendanceService, fileScanService, cronService } from '../services';
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
  getByDate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { date } = req.params; // Expected format: YYYY-MM-DD
    const user = req.user;
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        error: 'Invalid date format. Expected: YYYY-MM-DD'
      });
      return;
    }
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User information not found in token'
      });
      return;
    }

    console.log(`departemnt: ${user.department}`)
    
    const records = await attendanceService.getAttendanceByDate(date, user.role, user.empID, user.department);
    
    res.status(200).json({
      success: true,
      data: {
        date,
        count: records.length,
        records
      }
    });
  });

  // Get attendance records for a date range
  getByDateRange = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    const user = req.user;
    
    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
      return;
    }
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User information not found in token'
      });
      return;
    }
    
    const records = await attendanceService.getAttendanceByDateRange(
      startDate as string,
      endDate as string,
      user.role,
      user.empID,
      user.department
    );
    
    res.status(200).json({
      success: true,
      data: {
        startDate,
        endDate,
        count: records.length,
        records
      }
    });
  });
  
  // Get attendance records for an employee within a date range
  getEmployeeAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { empID } = req.params;
    const { startDate, endDate } = req.query;
    const user = req.user;
    
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

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User information not found in token'
      });
      return;
    }
    
    const records = await attendanceService.getEmployeeAttendance(
      empID,
      startDate as string,
      endDate as string,
      user.role,
      user.empID,
      user.department
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

  // Scan data folder for saveData.txt files and process them
  scanAndImport = asyncHandler(async (req: Request, res: Response) => {
    const result = await fileScanService.scanDataFolder();
    
    res.status(200).json({
      success: true,
      message: 'Data folder scan completed',
      data: result
    });
  });

  // Get tracked files information
  getTrackedFiles = asyncHandler(async (req: Request, res: Response) => {
    const files = await fileScanService.getTrackedFiles();
    
    res.status(200).json({
      success: true,
      data: {
        count: files.length,
        files
      }
    });
  });

  // Get file scanning statistics
  getFileStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await fileScanService.getFileStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  });

  // Start automated file scanning cron job
  startCronJob = asyncHandler(async (req: Request, res: Response) => {
    cronService.startFileScanning();
    
    res.status(200).json({
      success: true,
      message: 'Automated file scanning started (runs every 5 minutes)',
      data: cronService.getStatus()
    });
  });

  // Stop automated file scanning cron job
  stopCronJob = asyncHandler(async (req: Request, res: Response) => {
    cronService.stopFileScanning();
    
    res.status(200).json({
      success: true,
      message: 'Automated file scanning stopped',
      data: cronService.getStatus()
    });
  });

  // Get cron job status
  getCronStatus = asyncHandler(async (req: Request, res: Response) => {
    const status = cronService.getStatus();
    
    res.status(200).json({
      success: true,
      data: status
    });
  });

  // Run file scan manually
  runScanNow = asyncHandler(async (req: Request, res: Response) => {
    const result = await cronService.runFileScanNow();
    
    res.status(200).json({
      success: true,
      message: 'Manual file scan completed',
      data: result
    });
  });
}

export const attendanceController = new AttendanceController();