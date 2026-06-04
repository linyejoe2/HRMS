import { Request, Response } from 'express';
import { LeaveService } from '../services/leaveService';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { generateAnnualLeaveTable } from '../services/excel/annualLeaveTable';
import { generateLeaveSummaryReport } from '../services/excel/leaveSummaryReport';

export const createLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  // return res.status(400).json({success: false, message: "測試失敗"})
  const { leaveType, reason, leaveStart, leaveEnd } = req.body;
  const empID = req.user!.empID;

  const leaveData: any = {
    leaveType,
    reason,
    leaveStart,
    leaveEnd
  };

  // Handle uploaded files
  const files = req.files as Express.Multer.File[];
  if (files && files.length > 0) {
    // Store relative paths to the files
    leaveData.supportingInfo = files.map(file => `/uploads/leave/${file.filename}`);
  }

  const leave = await LeaveService.createLeaveRequest(empID, leaveData);

  res.status(201).json({
    error: false,
    message: '請假申請已成功建立',
    data: leave
  });
});

export const getMyLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const empID = req.user!.empID;
  const leaves = await LeaveService.getLeaveRequestsByEmployee(empID);

  res.json({
    error: false,
    message: '已成功取得請假紀錄',
    data: leaves
  });
});

export const getAllLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const leaves = await LeaveService.getAllLeaveRequests(status as string);

  res.json({
    error: false,
    message: '成功取得所有請假紀錄',
    data: leaves
  });
});

export const approveLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const approvedBy = req.user!.empID;

  // Extract file paths from uploaded files
  const files = req.files as Express.Multer.File[];
  const filePaths = files?.map(file => `/uploads/leave/${file.filename}`) || [];

  const leave = await LeaveService.approveLeaveRequest(id, approvedBy, filePaths.length > 0 ? filePaths : undefined);

  res.json({
    error: false,
    message: '請假申請已核准',
    data: leave
  });
});

export const rejectLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const rejectedBy = req.user!.empID;

  // Extract file paths from uploaded files
  const files = req.files as Express.Multer.File[];
  const filePaths = files?.map(file => `/uploads/leave/${file.filename}`) || [];

  const leave = await LeaveService.rejectLeaveRequest(id, reason, rejectedBy, filePaths.length > 0 ? filePaths : undefined);

  res.json({
    error: false,
    message: '請假申請已駁回',
    data: leave
  });
});

export const getLeaveRequestById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const leave = await LeaveService.getLeaveRequestById(id);

  res.json({
    error: false,
    message: '成功取得請假紀錄',
    data: leave
  });
});

export const cancelLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const cancelledBy = req.user!.empID;

  const leave = await LeaveService.cancelLeaveRequest(id, cancelledBy, reason);

  res.json({
    error: false,
    message: '請假申請已取消',
    data: leave
  });
});

export const getCancelLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { employeeID } = req.query;
  const leaves = await LeaveService.getCancelLeaveRequests(employeeID as string);

  res.json({
    error: false,
    message: '成功取得已取消的請假紀錄',
    data: leaves
  });
});

export const getLeaveRequestBySequenceNumber = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sequenceNumber } = req.params;
  const leave = await LeaveService.getLeaveRequestBySequenceNumber(Number(sequenceNumber));

  res.json({
    error: false,
    message: '成功取得請假紀錄',
    data: leave
  });
});

export const queryLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { timeStart, timeEnd, leaveType, status } = req.body;

  if (!timeStart || !timeEnd) {
    return res.status(400).json({
      error: true,
      message: 'timeStart 和 timeEnd 為必填欄位'
    });
  }

  const leaves = await LeaveService.queryLeaveRequests({
    timeStart,
    timeEnd,
    leaveType,
    status
  });

  res.json({
    error: false,
    message: '成功查詢請假紀錄',
    data: leaves
  });
});

export const importLeaveRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const records = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: true, message: '請提供請假紀錄陣列' });
  }

  const result = await LeaveService.importLeaveRequests(records);

  res.status(201).json({
    error: false,
    message: `成功匯入 ${result.imported} 筆，失敗 ${result.errors.length} 筆`,
    data: result
  });
});

/**
 * Download 特休表
 */
export const downloadAnnualLeaveReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({
      error: true,
      message: 'year 和 month 為必填參數'
    });
  }

  const yearNum  = parseInt(year as string);
  const monthNum = parseInt(month as string);

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({
      error: true,
      message: 'year 必須為數字，month 必須為 1–12'
    });
  }

  const buffer = await generateAnnualLeaveTable(yearNum, monthNum);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="leave_summary_${year}_${String(monthNum).padStart(2, '0')}.xlsx"`);
  res.send(buffer);
});

/**
 * Download 請假總表 (Leave Summary Report) Excel
 */
export const downloadLeaveSummaryReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({
      error: true,
      message: 'year 和 month 為必填參數'
    });
  }

  const yearNum  = parseInt(year as string);
  const monthNum = parseInt(month as string);

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({
      error: true,
      message: 'year 必須為數字，month 必須為 1–12'
    });
  }

  const buffer = await generateLeaveSummaryReport(yearNum, monthNum);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="leave_summary_${year}_${String(monthNum).padStart(2, '0')}.xlsx"`);
  res.send(buffer);
});

/**
 * Download 請假表 (Individual Employee Leave Report) Excel
 */
export const downloadEmployeeLeaveReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { empID, startDate, endDate } = req.query;

  if (!empID || !startDate || !endDate) {
    return res.status(400).json({
      error: true,
      message: 'empID, startDate 和 endDate 為必填參數'
    });
  }

  const buffer = await LeaveService.generateEmployeeLeaveReport(
    empID as string,
    startDate as string,
    endDate as string
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="leave_report_${empID}_${startDate}_${endDate}.xlsx"`);
  res.send(buffer);
});