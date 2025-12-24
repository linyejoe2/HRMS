import { Request, Response } from 'express';
import { attendanceService, fileScanService } from '../services';
import { attendanceAggregationService } from '../services/attendanceAggregationService';
import { asyncHandler, AuthRequest } from '../middleware';

export class AttendanceController {
  
  // Import attendance data for a specific date
  importByDate = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.params; // Expected format: YYYY-MM-DD

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        error: true,
        message: '無效的日期格式，應為：YYYY-MM-DD'
      });
      return;
    }
    
    const result = await attendanceService.importAttendanceByDate(date);
    
    res.status(200).json({
      error: false,
      message: `已匯入 ${date} 的出勤資料`,
      data: result
    });
  });
  
  // Get attendance records for a specific date
  getByDate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { date } = req.params; // Expected format: YYYY-MM-DD
    const user = req.user;
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        error: true,
        message: '無效的日期格式，應為：YYYY-MM-DD'
      });
      return;
    }

    if (!user) {
      res.status(401).json({
        error: true,
        message: '權杖中找不到使用者資訊'
      });
      return;
    }

    console.log(`departemnt: ${user.department}`)
    
    const records = await attendanceService.getAttendanceByDate(date, user.role, user.empID, user.department);
    
    res.status(200).json({
      error: false,
      message: '已成功取得出勤紀錄',
      data: {
        date,
        count: records.length,
        records
      }
    });
  });

  // Get aggregated attendance records for a date range
  // Includes attendance, leave, business trip, post clock, and holiday data
  getByDateRange = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    const user = req.user;

    if (!startDate || !endDate) {
      res.status(400).json({
        error: true,
        message: '開始日期和結束日期為必填'
      });
      return;
    }

    if (!user) {
      res.status(401).json({
        error: true,
        message: '找不到使用者資訊'
      });
      return;
    }

    const aggregatedData = await attendanceAggregationService.getAggregatedAttendance(
      startDate as string,
      endDate as string,
      user.role,
      user.empID,
      user.cardID,
      user.department
    );

    res.status(200).json({
      error: false,
      message: '已成功取得出勤紀錄',
      data: aggregatedData
    });
  });
  
  // Get attendance records for an employee within a date range
  getEmployeeAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { empID } = req.params;
    const { startDate, endDate } = req.query;
    const user = req.user;
    
    if (!empID) {
      res.status(400).json({
        error: true,
        message: '員工編號為必填'
      });
      return;
    }

    if (!startDate || !endDate) {
      res.status(400).json({
        error: true,
        message: '開始日期和結束日期為必填'
      });
      return;
    }

    if (!user) {
      res.status(401).json({
        error: true,
        message: '找不到使用者資訊'
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
      error: false,
      message: '已成功取得員工出勤紀錄',
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
        error: true,
        message: '找不到員工編號'
      });
      return;
    }

    if (!startDate || !endDate) {
      res.status(400).json({
        error: true,
        message: '開始日期和結束日期為必填'
      });
      return;
    }
    
    const records = await attendanceService.getEmployeeAttendance(
      empID,
      startDate as string,
      endDate as string
    );
    
    res.status(200).json({
      error: false,
      message: '已成功取得我的出勤紀錄',
      data: {
        empID,
        startDate,
        endDate,
        count: records.length,
        records
      }
    });
  });

  // Scan data folder for saveData.txt files and process them
  scanAndImport = asyncHandler(async (req: Request, res: Response) => {
    const result = await fileScanService.scanDataFolder();
    
    res.status(200).json({
      error: false,
      message: '資料夾掃描完成',
      data: result
    });
  });

  // Get tracked files information
  getTrackedFiles = asyncHandler(async (req: Request, res: Response) => {
    const files = await fileScanService.getTrackedFiles();
    
    res.status(200).json({
      error: false,
      message: '已成功取得追蹤檔案清單',
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
      error: false,
      message: '已成功取得檔案統計',
      data: stats
    });
  });

  // Run file scan manually
  runScanNow = asyncHandler(async (req: Request, res: Response) => {
    const result = await fileScanService.scanDataFolder();

    res.status(200).json({
      error: false,
      message: '手動掃描完成',
      data: result
    });
  });

  // Clean up holiday (weekend) attendance records
  cleanHolidayRecords = asyncHandler(async (req: Request, res: Response) => {
    const result = await attendanceService.cleanHolidayRecords();

    res.status(200).json({
      error: false,
      message: '假日出勤紀錄清理完成',
      data: {
        deletedCount: result.deletedCount,
        errors: result.errors
      }
    });
  });
}

export const attendanceController = new AttendanceController();