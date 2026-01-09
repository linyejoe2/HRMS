import { Router } from 'express';
import authRoutes from './authRoutes';
import employeeRoutes from './employeeRoutes';
import migrationRoutes from './migrationRoutes';
import attendanceRoutes from './attendanceRoutes';
import leaveRoutes from './leaveRoutes';
import postClockRoutes from './postClockRoutes';
import businessTripRoutes from './businessTripRoutes';
import officialBusinessRoutes from './officialBusinessRoutes';
import leaveAdjustmentRoutes from './leaveAdjustmentRoutes';
import kanbanRoutes from './kanbanRoutes';
import variableRoutes from './variableRoutes';
import holidayRoutes from './holidayRoutes';
import { fixMulterChineseFileName } from '../middleware/upload';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HRMS API is running',
    timestamp: new Date().toISOString()
  });
});

router.use(fixMulterChineseFileName);

// API routes
router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/migration', migrationRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);
router.use('/leave-adjustments', leaveAdjustmentRoutes);
router.use('/postclock', postClockRoutes);
router.use('/businesstrip', businessTripRoutes);
router.use('/officialbusiness', officialBusinessRoutes);
router.use('/kanban', kanbanRoutes);
router.use('/variables', variableRoutes);
router.use('/holidays', holidayRoutes);

export default router;