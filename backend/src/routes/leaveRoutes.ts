import { Router } from 'express';
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveRequestById
} from '../controllers/leaveController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateLeaveRequest } from '../middleware/validation';
import { validateLeaveRule } from '../middleware/leaveRule';

const router = Router();

router.post('/create', authenticateToken, validateLeaveRequest, validateLeaveRule, createLeaveRequest);

router.get('/my', authenticateToken, getMyLeaveRequests);

router.get('/all', authenticateToken, requireRole(['hr', 'admin']), getAllLeaveRequests);

router.get('/:id', authenticateToken, getLeaveRequestById);

router.put('/:id/approve', authenticateToken, requireRole(['hr', 'admin']), approveLeaveRequest);

router.put('/:id/reject', authenticateToken, requireRole(['hr', 'admin']), rejectLeaveRequest);

export default router;