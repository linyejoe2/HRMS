import { Router } from 'express';
import {
  createPostClockRequest,
  getMyPostClockRequests,
  getAllPostClockRequests,
  approvePostClockRequest,
  rejectPostClockRequest,
  getPostClockRequestById,
  cancelPostClockRequest,
  getCancelPostClockRequests,
  getPostClockRequestBySequenceNumber
} from '../controllers/postClockController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { uploadPostClockFiles } from '../middleware/upload';

const router = Router();

router.post('/create', authenticateToken, uploadPostClockFiles.array('supportingInfo', 10), createPostClockRequest);

router.get('/my', authenticateToken, getMyPostClockRequests);

router.get('/all', authenticateToken, requireRole(['hr', 'admin']), getAllPostClockRequests);

router.get('/sequence/:sequenceNumber', authenticateToken, getPostClockRequestBySequenceNumber);

router.get('/:id', authenticateToken, getPostClockRequestById);

router.put('/:id/approve', authenticateToken, requireRole(['hr', 'admin']), uploadPostClockFiles.array('files', 10), approvePostClockRequest);

router.put('/:id/reject', authenticateToken, requireRole(['hr', 'admin']), uploadPostClockFiles.array('files', 10), rejectPostClockRequest);

router.put('/:id/cancel', authenticateToken, cancelPostClockRequest);

router.get('/cancelled/all', authenticateToken, requireRole(['hr', 'admin']), getCancelPostClockRequests);

export default router;
