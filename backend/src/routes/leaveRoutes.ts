import { Router } from 'express';
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveRequestById,
  cancelLeaveRequest,
  getCancelLeaveRequests,
  getLeaveRequestBySequenceNumber,
  queryLeaveRequests
} from '../controllers/leaveController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateLeaveRequest } from '../middleware/validation';
import { validateLeaveRule } from '../middleware/leaveRule';
import { uploadLeaveFiles } from '../middleware/upload';

const router = Router();

router.post('/create', authenticateToken, uploadLeaveFiles.array('supportingInfo', 10), validateLeaveRequest, validateLeaveRule, createLeaveRequest);

router.get('/my', authenticateToken, getMyLeaveRequests);

router.get('/all', authenticateToken, requireRole(['hr', 'admin']), getAllLeaveRequests);

router.get('/sequence/:sequenceNumber', authenticateToken, getLeaveRequestBySequenceNumber);

router.get('/:id', authenticateToken, getLeaveRequestById);

router.put('/:id/approve', authenticateToken, requireRole(['hr', 'admin']), approveLeaveRequest);

router.put('/:id/reject', authenticateToken, requireRole(['hr', 'admin']), rejectLeaveRequest);

router.put('/:id/cancel', authenticateToken, cancelLeaveRequest);

router.get('/cancelled/all', authenticateToken, requireRole(['hr', 'admin']), getCancelLeaveRequests);

router.post('/query', authenticateToken, queryLeaveRequests);

export default router;