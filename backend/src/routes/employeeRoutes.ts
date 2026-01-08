import { Router } from 'express';
import { employeeController } from '../controllers';
import { authenticateToken, requireRole } from '../middleware';

const router = Router();

router.use(authenticateToken);

// Routes accessible by all authenticated users
router.get('/', employeeController.getAllEmployees);
router.get('/search', employeeController.searchEmployees);
router.get('/:id', employeeController.getEmployee);
router.get('/empid/:id', employeeController.getEmployeeByEmpID);

// Routes accessible only by HR and Admin
router.post('/', requireRole(['admin', 'hr']), employeeController.createEmployee);
router.put('/:id', requireRole(['admin', 'hr']), employeeController.updateEmployee);
router.put('/:id/reset-password', requireRole(['admin']), employeeController.resetPassword);
router.delete('/:id', requireRole(['admin']), employeeController.deleteEmployee);

export default router;