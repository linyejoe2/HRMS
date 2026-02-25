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
  queryLeaveRequests,
  downloadLeaveSummaryReport,
  downloadEmployeeLeaveReport
} from '../controllers/leaveController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateLeaveRequest } from '../middleware/validation';
import { validateLeaveRule } from '../middleware/leaveRule';
import { uploadLeaveFiles } from '../middleware/upload';

const router = Router();

router.post('/create', authenticateToken, uploadLeaveFiles.array('supportingInfo', 10), validateLeaveRequest, validateLeaveRule, createLeaveRequest);

router.get('/my', authenticateToken, getMyLeaveRequests);

router.get('/all', authenticateToken, requireRole(['hr', 'admin']), getAllLeaveRequests);

// Report download routes (HR/Admin only) - must be before /:id route
router.get('/reports/summary', authenticateToken, requireRole(['hr', 'admin']), downloadLeaveSummaryReport);
router.get('/reports/employee', authenticateToken, requireRole(['hr', 'admin']), downloadEmployeeLeaveReport);

router.get('/sequence/:sequenceNumber', authenticateToken, getLeaveRequestBySequenceNumber);

router.get('/:id', authenticateToken, getLeaveRequestById);

router.put('/:id/approve', authenticateToken, requireRole(['hr', 'admin']), uploadLeaveFiles.array('files', 10), approveLeaveRequest);

router.put('/:id/reject', authenticateToken, requireRole(['hr', 'admin']), uploadLeaveFiles.array('files', 10), rejectLeaveRequest);

router.put('/:id/cancel', authenticateToken, cancelLeaveRequest);

router.get('/cancelled/all', authenticateToken, requireRole(['hr', 'admin']), getCancelLeaveRequests);

router.post('/query', authenticateToken, queryLeaveRequests);

export default router;