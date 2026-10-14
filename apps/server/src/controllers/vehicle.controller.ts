import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error-handler';
import { CreateVehicleSchema } from '@rideshare/shared';

export class VehicleController {
  /**
   * Get all vehicles registered by the authenticated user
   */
  static async getMyVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const vehicles = await prisma.vehicle.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: vehicles,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Register a new vehicle
   */
  static async createVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const data = CreateVehicleSchema.parse(req.body);

      // Check if license plate is already registered
      const existing = await prisma.vehicle.findUnique({
        where: { licensePlate: data.licensePlate.trim().toUpperCase() },
      });

      if (existing) {
        throw new AppError('A vehicle with this license plate is already registered.', 409, 'PLATE_ALREADY_EXISTS');
      }

      const vehicle = await prisma.vehicle.create({
        data: {
          userId,
          make: data.make.trim(),
          model: data.model.trim(),
          year: data.year,
          color: data.color.trim(),
          licensePlate: data.licensePlate.trim().toUpperCase(),
          capacity: data.capacity,
        },
      });

      // If user was a passenger, automatically upgrade them to driver
      if (req.user!.role === 'PASSENGER') {
        await prisma.user.update({
          where: { id: userId },
          data: { role: 'DRIVER' },
        });
      }

      res.status(201).json({
        success: true,
        message: 'Vehicle registered successfully! You are now an authorized Driver.',
        data: vehicle,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete a vehicle (if no active upcoming rides)
   */
  static async deleteVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: {
          rides: {
            where: {
              status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            },
          },
        },
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
      }

      if (vehicle.userId !== userId) {
        throw new AppError('You do not have permission to delete this vehicle', 403, 'FORBIDDEN');
      }

      if (vehicle.rides.length > 0) {
        throw new AppError(
          'Cannot delete vehicle with active scheduled or in-progress rides. Cancel or complete rides first.',
          400,
          'VEHICLE_IN_USE',
        );
      }

      await prisma.$transaction(async (tx) => {
        const pastRides = await tx.ride.findMany({ where: { vehicleId: id }, select: { id: true } });
        const rideIds = pastRides.map((r) => r.id);
        if (rideIds.length > 0) {
          await tx.review.deleteMany({ where: { rideId: { in: rideIds } } });
          await tx.rideRequest.deleteMany({ where: { rideId: { in: rideIds } } });
          await tx.ride.deleteMany({ where: { id: { in: rideIds } } });
        }
        await tx.vehicle.delete({ where: { id } });
      });

      res.status(200).json({
        success: true,
        message: 'Vehicle deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
