import { Router } from 'express';
import { kanbanController } from '../controllers';
import { authenticateToken } from '../middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for kanban endpoints
const kanbanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(kanbanLimiter);

// All routes require authentication
router.use(authenticateToken);

// Get all tasks or tasks grouped by status
router.get('/', kanbanController.getAllTasks);
router.get('/grouped', kanbanController.getTasksByStatus);

// Get a single task
router.get('/:id', kanbanController.getTask);

// Create a new task
router.post('/', kanbanController.createTask);

// Update a task
router.put('/:id', kanbanController.updateTask);

// Move a task to different status
router.patch('/:id/move', kanbanController.moveTask);

// Delete a task (soft delete)
router.delete('/:id', kanbanController.deleteTask);

// Restore a deleted task
router.post('/:id/restore', kanbanController.restoreTask);

// File operations
router.post('/:id/files', kanbanController.uploadFiles, kanbanController.uploadTaskFiles);
router.delete('/:id/files', kanbanController.removeTaskFile);

export default router;
