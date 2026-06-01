import { Router } from 'express';
import { getLegacyLeave, upsertLegacyLeave, deleteLegacyLeave } from '../controllers/legacyLeaveController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/:empID', authenticateToken, getLegacyLeave);
router.post('/:empID/:month', authenticateToken, requireRole(['hr', 'admin']), upsertLegacyLeave);
router.delete('/:empID/:month', authenticateToken, requireRole(['hr', 'admin']), deleteLegacyLeave);

export default router;
