import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { BusinessTripService } from '../services/businessTripService';
import { asyncHandler } from '../middleware/errorHandler';

export const createBusinessTripRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const empID = req.user!.empID;
  const businessTripData = req.body;

  // Handle uploaded files
  const files = req.files as Express.Multer.File[];
  if (files && files.length > 0) {
    // Store relative paths to the files
    businessTripData.supportingInfo = files.map(file => `/uploads/businesstrip/${file.filename}`);
  }

  const businessTrip = await BusinessTripService.createBusinessTripRequest(empID, businessTripData);

  res.status(201).json({
    error: false,
    message: '出差申請已建立',
    data: businessTrip
  });
});

export const getMyBusinessTripRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const empID = req.user!.empID;

  const businessTrips = await BusinessTripService.getBusinessTripRequestsByEmployee(empID);

  res.status(200).json({
    error: false,
    message: '成功取得出差申請',
    data: businessTrips
  });
});

export const getAllBusinessTripRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;

  const businessTrips = await BusinessTripService.getAllBusinessTripRequests(status as string);

  res.status(200).json({
    error: false,
    message: '成功取得所有出差申請',
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
    message: '出差申請已核准',
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
    message: '出差申請已拒絕',
    data: businessTrip
  });
});

export const getBusinessTripRequestById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const businessTrip = await BusinessTripService.getBusinessTripRequestById(id);

  res.status(200).json({
    error: false,
    message: '成功取得出差申請',
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
    message: '出差申請已取消',
    data: businessTrip
  });
});

export const getCancelBusinessTripRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { employeeID } = req.query;

  const businessTrips = await BusinessTripService.getCancelBusinessTripRequests(employeeID as string);

  res.status(200).json({
    error: false,
    message: '成功取得已取消的出差申請',
    data: businessTrips
  });
});

export const getBusinessTripRequestBySequenceNumber = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sequenceNumber } = req.params;

  const businessTrip = await BusinessTripService.getBusinessTripRequestBySequenceNumber(Number(sequenceNumber));

  res.status(200).json({
    error: false,
    message: '成功取得出差申請',
    data: businessTrip
  });
});
