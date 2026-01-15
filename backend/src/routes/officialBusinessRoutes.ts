import { Router } from 'express';
import { officialBusinessController } from '../controllers/officialBusinessController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { uploadOfficialBusinessFiles } from '../middleware/upload';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Routes accessible by all authenticated users
router.post('/create', uploadOfficialBusinessFiles.array('supportingInfo', 10), officialBusinessController.createOfficialBusinessRequest);
router.get('/my', officialBusinessController.getMyOfficialBusinessRequests);

// Routes accessible only by HR and Admin - must come before /:id route
router.get('/all', requireRole(['admin', 'hr']), officialBusinessController.getAllOfficialBusinessRequests);
router.get('/cancelled/all', requireRole(['admin', 'hr']), officialBusinessController.getCancelledOfficialBusinessRequests);

// Specific routes must come before dynamic :id route
router.get('/sequence/:sequenceNumber', officialBusinessController.getOfficialBusinessRequestBySequenceNumber);

// Dynamic routes - must come last to avoid matching specific paths
router.get('/:id', officialBusinessController.getOfficialBusinessRequestById);
router.put('/:id/cancel', officialBusinessController.cancelOfficialBusinessRequest);
router.put('/:id/approve', requireRole(['admin', 'hr']), uploadOfficialBusinessFiles.array('files', 10), officialBusinessController.approveOfficialBusinessRequest);
router.put('/:id/reject', requireRole(['admin', 'hr']), uploadOfficialBusinessFiles.array('files', 10), officialBusinessController.rejectOfficialBusinessRequest);

export default router;
