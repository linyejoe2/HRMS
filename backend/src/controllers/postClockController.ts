import { Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { PostClockService } from '../services/postClockService';
import { asyncHandler } from '../middleware/errorHandler';

export const createPostClockRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isHrOverride = ['hr', 'admin'].includes(req.user!.role) && req.body.empID;
  const empID = isHrOverride ? req.body.empID : req.user!.empID;
  const { empID: _omit, ...postClockData } = req.body;

  // Handle uploaded files
  const files = req.files as Express.Multer.File[];
  if (files && files.length > 0) {
    // Store relative paths to the files
    postClockData.supportingInfo = files.map(file => `/uploads/postclock/${file.filename}`);
  }

  const postClock = await PostClockService.createPostClockRequest(empID, postClockData);

  res.status(201).json({
    error: false,
    message: '補單申請已建立',
    data: postClock
  });
});

export const getMyPostClockRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const empID = req.user!.empID;

  const postClocks = await PostClockService.getPostClockRequestsByEmployee(empID);

  res.status(200).json({
    error: false,
    message: '成功取得補單申請',
    data: postClocks
  });
});

export const getAllPostClockRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;

  const postClocks = await PostClockService.getAllPostClockRequests(status as string);

  res.status(200).json({
    error: false,
    message: '成功取得所有補單申請',
    data: postClocks
  });
});

export const approvePostClockRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const approvedBy = req.user!.empID;

  // Extract file paths from uploaded files
  const files = req.files as Express.Multer.File[];
  const filePaths = files?.map(file => `/uploads/postclock/${file.filename}`) || [];

  const postClock = await PostClockService.approvePostClockRequest(id, approvedBy, filePaths.length > 0 ? filePaths : undefined);

  res.status(200).json({
    error: false,
    message: '補單申請已核准',
    data: postClock
  });
});

export const rejectPostClockRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const rejectedBy = req.user!.empID;

  // Extract file paths from uploaded files
  const files = req.files as Express.Multer.File[];
  const filePaths = files?.map(file => `/uploads/postclock/${file.filename}`) || [];

  const postClock = await PostClockService.rejectPostClockRequest(id, reason, rejectedBy, filePaths.length > 0 ? filePaths : undefined);

  res.status(200).json({
    error: false,
    message: '補單申請已拒絕',
    data: postClock
  });
});

const postClockUploadDir = path.resolve(process.cwd(), config.uploadPath, 'postclock');

const removeUploadedFiles = async (files: Express.Multer.File[] = []) => {
  await Promise.all(files.map(file => fs.unlink(file.path).catch(() => undefined)));
};

const getSafePostClockFilePath = (filePath: string) => {
  const prefix = '/uploads/postclock/';
  if (!filePath.startsWith(prefix)) throw new Error('不合法的附件路徑');

  const filename = filePath.slice(prefix.length);
  if (!filename || filename !== path.basename(filename)) throw new Error('不合法的附件路徑');

  const resolvedPath = path.resolve(postClockUploadDir, filename);
  if (!resolvedPath.startsWith(`${postClockUploadDir}${path.sep}`)) throw new Error('不合法的附件路徑');
  return resolvedPath;
};

export const uploadPostClockAttachments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) return res.status(400).json({ error: true, message: '請選擇至少一個附件' });

  try {
    const postClock = await PostClockService.appendSupportingInfo(req.params.id, files.map(file => `/uploads/postclock/${file.filename}`));
    res.json({ error: false, message: '附件已新增', data: postClock });
  } catch (error) {
    await removeUploadedFiles(files);
    throw error;
  }
});

export const deletePostClockAttachment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { filePath } = req.body;
  if (typeof filePath !== 'string') return res.status(400).json({ error: true, message: 'filePath 為必填欄位' });

  let diskPath: string;
  try {
    diskPath = getSafePostClockFilePath(filePath);
  } catch {
    return res.status(400).json({ error: true, message: '不合法的附件路徑' });
  }

  const postClock = await PostClockService.deleteSupportingInfo(req.params.id, filePath);
  await fs.unlink(diskPath).catch(() => undefined);
  res.json({ error: false, message: '附件已刪除', data: postClock });
});

export const getPostClockRequestById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const postClock = await PostClockService.getPostClockRequestById(id);

  res.status(200).json({
    error: false,
    message: '成功取得補單申請',
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
    message: '補單申請已取消',
    data: postClock
  });
});

export const getCancelPostClockRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { employeeID } = req.query;

  const postClocks = await PostClockService.getCancelPostClockRequests(employeeID as string);

  res.status(200).json({
    error: false,
    message: '成功取得已取消的補單申請',
    data: postClocks
  });
});

export const getPostClockRequestBySequenceNumber = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sequenceNumber } = req.params;

  const postClock = await PostClockService.getPostClockRequestBySequenceNumber(Number(sequenceNumber));

  res.status(200).json({
    error: false,
    message: '成功取得補單申請',
    data: postClock
  });
});
