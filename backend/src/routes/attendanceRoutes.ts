import { Router } from 'express';
import { attendanceController } from '../controllers';
import { authenticateToken, requireRole } from '../middleware';
import rateLimit from 'express-rate-limit';
import { cronService } from '../services';

const router = Router();

// Rate limiting for attendance endpoints
const attendanceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(attendanceLimiter);

/**
 * ex: http://localhost:5200/api/attendance/create-attendance-record/2025-12-25
 */
router.get('/create-attendance-record/:date', async (req, res) => {
  res.status(200).json(await cronService.runCreateAttendanceNow(new Date(req.params.date)))
});
router.get('/clean-holidays', attendanceController.cleanHolidayRecords);

// All routes require authentication
router.use(authenticateToken);

// HR/Admin only routes
router.post('/import/:date', requireRole(['admin', 'hr']), attendanceController.importByDate);
router.post('/scan', requireRole(['admin', 'hr']), attendanceController.scanAndImport);
router.post('/scan/now', requireRole(['admin', 'hr']), attendanceController.runScanNow);
router.get('/files', requireRole(['admin', 'hr']), attendanceController.getTrackedFiles);
router.get('/files/stats', requireRole(['admin', 'hr']), attendanceController.getFileStats);
router.get('/employee/:empID', requireRole(['admin', 'hr', 'manager']), attendanceController.getEmployeeAttendance);

// All authenticated users can access these
router.get('/date/:date', attendanceController.getByDate);
router.get('/daterange', attendanceController.getByDateRange);
router.get('/my', attendanceController.getMyAttendance);

export default router;