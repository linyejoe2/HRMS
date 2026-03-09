import { Router } from 'express';
import { cardAssignmentController } from '../controllers/cardAssignmentController';
import { authenticateToken, requireRole } from '../middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/card-assignments/sync - trigger syncAttendanceMetadata (admin/hr only)
// Query params: startDate, endDate, employeeId
router.post('/sync', requireRole(['admin', 'hr']), cardAssignmentController.syncMetadata);

export default router;
