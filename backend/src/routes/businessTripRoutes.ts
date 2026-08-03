import { Router } from 'express';
import {
  createBusinessTripRequest,
  getMyBusinessTripRequests,
  getAllBusinessTripRequests,
  approveBusinessTripRequest,
  rejectBusinessTripRequest,
  getBusinessTripRequestById,
  cancelBusinessTripRequest,
  getCancelBusinessTripRequests,
  getBusinessTripRequestBySequenceNumber
} from '../controllers/businessTripController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { uploadBusinessTripFiles } from '../middleware/upload';

const router = Router();

router.post('/create', authenticateToken, uploadBusinessTripFiles.array('supportingInfo', 10), createBusinessTripRequest);

router.get('/my', authenticateToken, getMyBusinessTripRequests);

router.get('/all', authenticateToken, requireRole(['hr', 'admin']), getAllBusinessTripRequests);

router.get('/sequence/:sequenceNumber', authenticateToken, getBusinessTripRequestBySequenceNumber);

router.get('/:id', authenticateToken, getBusinessTripRequestById);

router.put('/:id/approve', authenticateToken, requireRole(['hr', 'admin']), uploadBusinessTripFiles.array('files', 10), approveBusinessTripRequest);

router.put('/:id/reject', authenticateToken, requireRole(['hr', 'admin']), uploadBusinessTripFiles.array('files', 10), rejectBusinessTripRequest);

router.put('/:id/cancel', authenticateToken, cancelBusinessTripRequest);

router.get('/cancelled/all', authenticateToken, requireRole(['hr', 'admin']), getCancelBusinessTripRequests);

export default router;
