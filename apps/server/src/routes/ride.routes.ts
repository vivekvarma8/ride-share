import { Router } from 'express';
import { RideController } from '../controllers/ride.controller';
import { RequestController } from '../controllers/request.controller';
import { requireAuth, requireDriver } from '../middleware/auth';

const router = Router();

// Public / Authenticated search
router.get('/', RideController.searchRides);

// Authenticated User Rides & Drives
router.get('/my/drives', requireAuth, requireDriver, RideController.getMyDrives);
router.get('/my/bookings', requireAuth, RideController.getMyBookings);

// Specific Ride view
router.get('/:id', RideController.getRideById);

// Create, Cancel, Complete, Delete Ride (Driver / Admin protected)
router.post('/', requireAuth, requireDriver, RideController.createRide);
router.patch('/:id/cancel', requireAuth, RideController.cancelRide);
router.patch('/:id/complete', requireAuth, requireDriver, RideController.completeRide);
router.post('/:id/start', requireAuth, requireDriver, RideController.startRide);
router.post('/:id/verify-otp', requireAuth, requireDriver, RideController.verifyOtp);
router.patch('/:id/location', requireAuth, RideController.updateLocation);
router.delete('/:id', requireAuth, RideController.deleteRide);

// Ride Request Operations
router.post('/:rideId/requests', requireAuth, RequestController.createRequest);
router.patch('/:rideId/requests/:requestId/status', requireAuth, RequestController.updateRequestStatus);
router.delete('/:rideId/requests/:requestId', requireAuth, RequestController.cancelRequest);

export default router;
