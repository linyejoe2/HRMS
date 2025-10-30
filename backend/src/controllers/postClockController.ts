import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PostClockService } from '../services/postClockService';
import { asyncHandler } from '../middleware/errorHandler';

export const createPostClockRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const empID = req.user!.empID;
  const postClockData = req.body;

  // Handle uploaded files
  const files = req.files as Express.Multer.File[];
  if (files && files.length > 0) {
    // Store relative paths to the files
    postClockData.supportingInfo = files.map(file => `/uploads/postclock/${file.filename}`);
  }

  const postClock = await PostClockService.createPostClockRequest(empID, postClockData);

  res.status(201).json({
    error: false,
    message: '補卡申請已建立',
    data: postClock
  });
});

export const getMyPostClockRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const empID = req.user!.empID;

  const postClocks = await PostClockService.getPostClockRequestsByEmployee(empID);

  res.status(200).json({
    error: false,
    message: '成功取得補卡申請',
    data: postClocks
  });
});

export const getAllPostClockRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;

  const postClocks = await PostClockService.getAllPostClockRequests(status as string);

  res.status(200).json({
    error: false,
    message: '成功取得所有補卡申請',
    data: postClocks
  });
});

export const approvePostClockRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const approvedBy = req.user!.empID;

  const postClock = await PostClockService.approvePostClockRequest(id, approvedBy);

  res.status(200).json({
    error: false,
    message: '補卡申請已核准',
    data: postClock
  });
});

export const rejectPostClockRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const rejectedBy = req.user!.empID;

  const postClock = await PostClockService.rejectPostClockRequest(id, reason, rejectedBy);

  res.status(200).json({
    error: false,
    message: '補卡申請已拒絕',
    data: postClock
  });
});

export const getPostClockRequestById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const postClock = await PostClockService.getPostClockRequestById(id);

  res.status(200).json({
    error: false,
    message: '成功取得補卡申請',
    data: postClock
  });
});

export const cancelPostClockRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const cancelledBy = req.user!.empID;

  const postClock = await PostClockService.cancelPostClockRequest(id, cancelledBy, reason);

  res.status(200).json({
    error: false,
    message: '補卡申請已取消',
    data: postClock
  });
});

export const getCancelPostClockRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { employeeID } = req.query;

  const postClocks = await PostClockService.getCancelPostClockRequests(employeeID as string);

  res.status(200).json({
    error: false,
    message: '成功取得已取消的補卡申請',
    data: postClocks
  });
});

export const getPostClockRequestBySequenceNumber = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sequenceNumber } = req.params;

  const postClock = await PostClockService.getPostClockRequestBySequenceNumber(Number(sequenceNumber));

  res.status(200).json({
    error: false,
    message: '成功取得補卡申請',
    data: postClock
  });
});
