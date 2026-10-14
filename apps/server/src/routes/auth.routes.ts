import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/google', AuthController.googleLogin);
router.get('/me', requireAuth, AuthController.getMe);
router.patch('/profile', requireAuth, AuthController.updateProfile);
router.post('/become-driver', requireAuth, AuthController.becomeDriver);

export default router;
