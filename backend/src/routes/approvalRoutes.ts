import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getPendingManagerApprovals } from '../controllers/approvalController';

const router = Router();

router.get('/pending-manager', authenticateToken, getPendingManagerApprovals);

export default router;
