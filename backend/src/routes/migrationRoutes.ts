import { Router } from 'express';
import { migrationController } from '../controllers';
import { authenticateToken, requireRole } from '../middleware';

const router = Router();
router.use(authenticateToken);
router.use(requireRole(['admin']));

router.post('/migrate', migrationController.migrateFromAccess);
router.get('/access/count', migrationController.getAccessEmployeeCount);
router.get('/access/test', migrationController.testAccessConnection);

export default router;