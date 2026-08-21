import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getPendingManagerApprovals } from '../controllers/approvalController';

const router = Router();

router.get('/pending-manager', authenticateToken, requireRole(['manager', "hr", "admin"]), getPendingManagerApprovals);

export default router;
