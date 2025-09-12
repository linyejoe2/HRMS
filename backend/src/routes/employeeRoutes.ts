import { Router } from 'express';
import { employeeController } from '../controllers';
import { authenticateToken, requireRole } from '../middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(generalLimiter);
router.use(authenticateToken);

// Routes accessible by all authenticated users
router.get('/', employeeController.getAllEmployees);
router.get('/search', employeeController.searchEmployees);
router.get('/:id', employeeController.getEmployee);

// Routes accessible only by HR and Admin
router.post('/', requireRole(['admin', 'hr']), employeeController.createEmployee);
router.put('/:id', requireRole(['admin', 'hr']), employeeController.updateEmployee);
router.delete('/:id', requireRole(['admin']), employeeController.deleteEmployee);

export default router;