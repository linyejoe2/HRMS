import { Router } from 'express';
import {
  createLeaveAdjustment,
  getLeaveAdjustmentsByEmployee,
  getAllLeaveAdjustments,
  deleteLeaveAdjustment
} from '../controllers/leaveAdjustmentController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Create a new leave adjustment (HR/Admin only)
router.post('/', authenticateToken, requireRole(['hr', 'admin']), createLeaveAdjustment);

// Get adjustments for a specific employee (optionally filter by leave type)
router.get('/employee/:empID', authenticateToken, getLeaveAdjustmentsByEmployee);

// Get all leave adjustments (HR/Admin only)
router.get('/all', authenticateToken, requireRole(['hr', 'admin']), getAllLeaveAdjustments);

// Delete a leave adjustment (HR/Admin only)
router.delete('/:id', authenticateToken, requireRole(['hr', 'admin']), deleteLeaveAdjustment);

export default router;
