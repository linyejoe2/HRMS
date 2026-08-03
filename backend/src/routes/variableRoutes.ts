import { Router } from 'express';
import { variableController } from '../controllers';
import { authenticateToken, requireRole, asyncHandler } from '../middleware';
import { variableSeedService } from '../services';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Public routes (all authenticated users can read)
router.get('/', variableController.getAllVariables);
router.get('/sections', variableController.getSections);
router.get('/section/:section', variableController.getBySection);
router.get('/code/:section/:code', variableController.getByCode);
router.get('/:id', variableController.getVariable);

// Protected routes (only HR and Admin can modify)
router.post('/', requireRole(['hr', 'admin']), variableController.createVariable);
router.post('/bulk', requireRole(['hr', 'admin']), variableController.bulkCreateVariables);
router.put('/:id', requireRole(['hr', 'admin']), variableController.updateVariable);
router.delete('/:id', requireRole(['admin']), variableController.deleteVariable);

// Admin only - Seed initial data
router.post('/seed', requireRole(['admin']), asyncHandler(async (req: any, res: any) => {
  await variableSeedService.seedVariables();
  res.status(200).json({
    error: false,
    message: '變數資料已初始化'
  });
}));

// Admin only - Reseed data
router.post('/reseed', requireRole(['admin']), asyncHandler(async (req: any, res: any) => {
  await variableSeedService.reseedVariables();
  res.status(200).json({
    error: false,
    message: '變數資料已重新初始化'
  });
}));

export default router;
