import { Router } from 'express';
import { VehicleController } from '../controllers/vehicle.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', VehicleController.getMyVehicles);
router.post('/', VehicleController.createVehicle);
router.delete('/:id', VehicleController.deleteVehicle);

export default router;
