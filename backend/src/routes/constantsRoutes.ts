import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getConstants } from '../controllers/constantsController';

const router = Router();

router.get('/', authenticateToken, getConstants);

export default router;
