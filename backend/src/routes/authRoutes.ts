import { Router } from 'express';
import { authController } from '../controllers';
import { validateRequest, loginSchema, registerSchema, authenticateToken, updateProfileSchema } from '../middleware';

const router = Router();

// Public routes
router.post('/login',  validateRequest(loginSchema), authController.login);
router.post('/register', validateRequest(registerSchema), authController.register);

// Protected routes
router.use(authenticateToken);

router.get('/me', authController.getProfile);
router.get('/profile', authController.getProfile);
router.post('/profile/sensitive', authController.getProfileWithSensitive);
router.put('/profile', validateRequest(updateProfileSchema), authController.updateProfile);
router.post('/change-password', authController.changePassword);
router.post('/logout', authController.logout);

export default router;