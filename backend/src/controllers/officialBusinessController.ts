import { Response } from 'express';
import { officialBusinessService } from '../services/officialBusinessService';
import { asyncHandler, AuthRequest } from '../middleware';

export class OfficialBusinessController {
  /**
   * Create official business request
   * POST /api/officialbusiness/create
   */
  createOfficialBusinessRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: true, message: '未授權' });
      return;
    }

    const { empIDs, licensePlate, startTime, endTime, purpose } = req.body;

    // Parse empIDs if it's a string (from FormData)
    const parsedEmpIDs = typeof empIDs === 'string' ? JSON.parse(empIDs) : empIDs;

    // Handle file uploads
    const files = req.files as Express.Multer.File[];
    const supportingInfo = files && files.length > 0
      ? files.map(file => `/uploads/officialbusiness/${file.filename}`)
      : [];

    const officialBusiness = await officialBusinessService.createOfficialBusinessRequest(
      user.empID,
      {
        empIDs: parsedEmpIDs,
        licensePlate,
        startTime,
        endTime,
        purpose,
        supportingInfo
      }
    );

    res.status(201).json({
      error: false,
      message: '外出申請已成功建立',
      data: officialBusiness
    });
  });

  /**
   * Get my official business requests
   * GET /api/officialbusiness/my
   */
  getMyOfficialBusinessRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: true, message: '未授權' });
      return;
    }

    const officialBusinessRequests = await officialBusinessService.getOfficialBusinessRequestsByEmployee(user.empID);

    res.status(200).json({
      error: false,
      message: '已成功取得外出申請記錄',
      data: officialBusinessRequests
    });
  });

  /**
   * Get all official business requests (HR/Admin only)
   * GET /api/officialbusiness/all
   */
  getAllOfficialBusinessRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status } = req.query;

    const officialBusinessRequests = await officialBusinessService.getAllOfficialBusinessRequests(
      status as string | undefined
    );

    res.status(200).json({
      error: false,
      message: '已成功取得所有外出申請',
      data: officialBusinessRequests
    });
  });

  /**
   * Get official business request by ID
   * GET /api/officialbusiness/:id
   */
  getOfficialBusinessRequestById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const officialBusiness = await officialBusinessService.getOfficialBusinessRequestById(id);

    res.status(200).json({
      error: false,
      message: '已成功取得外出申請',
      data: officialBusiness
    });
  });

  /**
   * Get official business request by sequence number
   * GET /api/officialbusiness/sequence/:sequenceNumber
   */
  getOfficialBusinessRequestBySequenceNumber = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sequenceNumber } = req.params;

    const officialBusiness = await officialBusinessService.getOfficialBusinessRequestBySequenceNumber(
      parseInt(sequenceNumber)
    );

    res.status(200).json({
      error: false,
      message: '已成功取得外出申請',
      data: officialBusiness
    });
  });

  /**
   * Approve official business request (HR/Admin only)
   * PUT /api/officialbusiness/:id/approve
   */
  approveOfficialBusinessRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: true, message: '未授權' });
      return;
    }

    // Extract file paths from uploaded files
    const files = req.files as Express.Multer.File[];
    const filePaths = files?.map(file => `/uploads/officialbusiness/${file.filename}`) || [];

    const officialBusiness = await officialBusinessService.approveOfficialBusinessRequest(id, user.empID, filePaths.length > 0 ? filePaths : undefined);

    res.status(200).json({
      error: false,
      message: '外出申請已核准',
      data: officialBusiness
    });
  });

  /**
   * Reject official business request (HR/Admin only)
   * PUT /api/officialbusiness/:id/reject
   */
  rejectOfficialBusinessRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: true, message: '未授權' });
      return;
    }

    if (!reason) {
      res.status(400).json({
        error: true,
        message: '拒絕理由為必填'
      });
      return;
    }

    // Extract file paths from uploaded files
    const files = req.files as Express.Multer.File[];
    const filePaths = files?.map(file => `/uploads/officialbusiness/${file.filename}`) || [];

    const officialBusiness = await officialBusinessService.rejectOfficialBusinessRequest(
      id,
      reason,
      user.empID,
      filePaths.length > 0 ? filePaths : undefined
    );

    res.status(200).json({
      error: false,
      message: '外出申請已拒絕',
      data: officialBusiness
    });
  });

  /**
   * Cancel official business request
   * PUT /api/officialbusiness/:id/cancel
   */
  cancelOfficialBusinessRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: true, message: '未授權' });
      return;
    }

    const officialBusiness = await officialBusinessService.cancelOfficialBusinessRequest(
      id,
      user.empID,
      reason
    );

    res.status(200).json({
      error: false,
      message: '外出申請已取消',
      data: officialBusiness
    });
  });

  /**
   * Get cancelled official business requests (HR/Admin only)
   * GET /api/officialbusiness/cancelled/all
   */
  getCancelledOfficialBusinessRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { employeeID } = req.query;

    const officialBusinessRequests = await officialBusinessService.getCancelledOfficialBusinessRequests(
      employeeID as string | undefined
    );

    res.status(200).json({
      error: false,
      message: '已成功取得已取消的外出申請',
      data: officialBusinessRequests
    });
  });
}

export const officialBusinessController = new OfficialBusinessController();
