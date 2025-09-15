import { Router } from 'express';
import { attendanceController } from '../controllers';
import { authenticateToken, requireRole } from '../middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for attendance endpoints
const attendanceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

// All routes require authentication
router.use(attendanceLimiter);
router.use(authenticateToken);

// HR/Admin only routes
router.post('/import/:date', requireRole(['admin', 'hr']), attendanceController.importByDate);
router.get('/summary', requireRole(['admin', 'hr']), attendanceController.getSummary);
router.get('/employee/:empID', requireRole(['admin', 'hr']), attendanceController.getEmployeeAttendance);

// All authenticated users can access these
router.get('/date/:date', attendanceController.getByDate);
router.get('/my', attendanceController.getMyAttendance);

export default router;