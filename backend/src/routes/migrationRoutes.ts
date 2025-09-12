import { Router } from 'express';
import { migrationController } from '../controllers';
import { authenticateToken, requireRole } from '../middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Strict rate limiting for migration endpoints
const migrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Only 5 migration attempts per hour
  message: {
    error: 'Too many migration attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// All migration routes require admin access
router.use(migrationLimiter);
router.use(authenticateToken);
router.use(requireRole(['admin']));

router.post('/migrate', migrationController.migrateFromAccess);
router.get('/access/count', migrationController.getAccessEmployeeCount);
router.get('/access/test', migrationController.testAccessConnection);

export default router;