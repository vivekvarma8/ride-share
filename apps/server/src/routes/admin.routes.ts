import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/metrics', AdminController.getMetrics);
router.get('/users', AdminController.getUsers);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.patch('/users/:id/role', AdminController.updateUserRole);
router.delete('/users/:id', AdminController.deleteUser);

router.get('/rides', AdminController.getAllRides);
router.patch('/rides/:id/cancel', AdminController.forceCancelRide);
router.delete('/rides/:id', AdminController.deleteRide);

router.get('/vehicles', AdminController.getAllVehicles);
router.delete('/vehicles/:id', AdminController.deleteVehicle);

export default router;
