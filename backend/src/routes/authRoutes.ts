import { Router } from 'express';
import { authController } from '../controllers';
import { validateRequest, loginSchema, registerSchema, authenticateToken, updateProfileSchema } from '../middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 999, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);
router.post('/register', authLimiter, validateRequest(registerSchema), authController.register);

// Protected routes
router.use(generalLimiter);
router.use(authenticateToken);

router.get('/me', authController.getProfile);
router.get('/profile', authController.getProfile);
router.post('/profile/sensitive', authController.getProfileWithSensitive);
router.put('/profile', validateRequest(updateProfileSchema), authController.updateProfile);
router.post('/change-password', authController.changePassword);
router.post('/logout', authController.logout);

export default router;