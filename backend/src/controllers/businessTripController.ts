import { Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { BusinessTripService } from '../services/businessTripService';
import { asyncHandler } from '../middleware/errorHandler';

export const createBusinessTripRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isHrOverride = ['hr', 'admin'].includes(req.user!.role) && req.body.empID;
  const empID = isHrOverride ? req.body.empID : req.user!.empID;
  const { empID: _omit, ...businessTripData } = req.body;

  // Handle uploaded files
  const files = req.files as Express.Multer.File[];
  if (files && files.length > 0) {
    // Store relative paths to the files
    businessTripData.supportingInfo = files.map(file => `/uploads/businesstrip/${file.filename}`);
  }

  const businessTrip = await BusinessTripService.createBusinessTripRequest(empID, businessTripData);

  res.status(201).json({
    error: false,
    message: '因公免刷卡申請已建立',
    data: businessTrip
  });
});

export const getMyBusinessTripRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const empID = req.user!.empID;

  const businessTrips = await BusinessTripService.getBusinessTripRequestsByEmployee(empID);

  res.status(200).json({
    error: false,
    message: '成功取得因公免刷卡申請',
    data: businessTrips
  });
});

export const getAllBusinessTripRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;

  const businessTrips = await BusinessTripService.getAllBusinessTripRequests(status as string);

  res.status(200).json({
    error: false,
    message: '成功取得所有因公免刷卡申請',
    data: businessTrips
  });
});

export const approveBusinessTripRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const approvedBy = req.user!.empID;

  // Extract file paths from uploaded files
  const files = req.files as Express.Multer.File[];
  const filePaths = files?.map(file => `/uploads/businesstrip/${file.filename}`) || [];

  const businessTrip = await BusinessTripService.approveBusinessTripRequest(id, approvedBy, filePaths.length > 0 ? filePaths : undefined);

  res.status(200).json({
    error: false,
    message: '因公免刷卡申請已核准',
    data: businessTrip
  });
});

export const rejectBusinessTripRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const rejectedBy = req.user!.empID;

  // Extract file paths from uploaded files
  const files = req.files as Express.Multer.File[];
  const filePaths = files?.map(file => `/uploads/businesstrip/${file.filename}`) || [];

  const businessTrip = await BusinessTripService.rejectBusinessTripRequest(id, reason, rejectedBy, filePaths.length > 0 ? filePaths : undefined);

  res.status(200).json({
    error: false,
    message: '因公免刷卡申請已拒絕',
    data: businessTrip
  });
});

const businessTripUploadDir = path.resolve(process.cwd(), config.uploadPath, 'businesstrip');

const removeUploadedFiles = async (files: Express.Multer.File[] = []) => {
  await Promise.all(files.map(file => fs.unlink(file.path).catch(() => undefined)));
};

const getSafeBusinessTripFilePath = (filePath: string) => {
  const prefix = '/uploads/businesstrip/';
  if (!filePath.startsWith(prefix)) throw new Error('不合法的附件路徑');

  const filename = filePath.slice(prefix.length);
  if (!filename || filename !== path.basename(filename)) throw new Error('不合法的附件路徑');

  const resolvedPath = path.resolve(businessTripUploadDir, filename);
  if (!resolvedPath.startsWith(`${businessTripUploadDir}${path.sep}`)) throw new Error('不合法的附件路徑');
  return resolvedPath;
};

export const uploadBusinessTripAttachments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) return res.status(400).json({ error: true, message: '請選擇至少一個附件' });

  try {
    const businessTrip = await BusinessTripService.appendSupportingInfo(req.params.id, files.map(file => `/uploads/businesstrip/${file.filename}`));
    res.json({ error: false, message: '附件已新增', data: businessTrip });
  } catch (error) {
    await removeUploadedFiles(files);
    throw error;
  }
});

export const deleteBusinessTripAttachment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { filePath } = req.body;
  if (typeof filePath !== 'string') return res.status(400).json({ error: true, message: 'filePath 為必填欄位' });

  let diskPath: string;
  try {
    diskPath = getSafeBusinessTripFilePath(filePath);
  } catch {
    return res.status(400).json({ error: true, message: '不合法的附件路徑' });
  }

  const businessTrip = await BusinessTripService.deleteSupportingInfo(req.params.id, filePath);
  await fs.unlink(diskPath).catch(() => undefined);
  res.json({ error: false, message: '附件已刪除', data: businessTrip });
});

export const getBusinessTripRequestById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const businessTrip = await BusinessTripService.getBusinessTripRequestById(id);

  res.status(200).json({
    error: false,
    message: '成功取得因公免刷卡申請',
    data: businessTrip
  });
});

export const cancelBusinessTripRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const cancelledBy = req.user!.empID;

  const businessTrip = await BusinessTripService.cancelBusinessTripRequest(id, cancelledBy, reason);

  res.status(200).json({
    error: false,
    message: '因公免刷卡申請已取消',
    data: businessTrip
  });
});

export const getCancelBusinessTripRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { employeeID } = req.query;

  const businessTrips = await BusinessTripService.getCancelBusinessTripRequests(employeeID as string);

  res.status(200).json({
    error: false,
    message: '成功取得已取消的因公免刷卡申請',
    data: businessTrips
  });
});

export const getBusinessTripRequestBySequenceNumber = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sequenceNumber } = req.params;

  const businessTrip = await BusinessTripService.getBusinessTripRequestBySequenceNumber(Number(sequenceNumber));

  res.status(200).json({
    error: false,
    message: '成功取得因公免刷卡申請',
    data: businessTrip
  });
});
