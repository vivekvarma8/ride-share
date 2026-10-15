import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error-handler';
import { NotificationService } from '../services/notification.service';
import { UpdateUserStatusSchema, NotificationType, RideStatus } from '@rideshare/shared';

export class AdminController {
  /**
   * Get platform-wide operational metrics
   */
  static async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalUsers,
        activeUsers,
        totalRides,
        activeRides,
        completedRides,
        totalBookings,
        totalVehicles,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.ride.count(),
        prisma.ride.count({ where: { status: 'SCHEDULED' } }),
        prisma.ride.count({ where: { status: 'COMPLETED' } }),
        prisma.rideRequest.count({ where: { status: 'APPROVED' } }),
        prisma.vehicle.count(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalUsers,
          activeUsers,
          totalRides,
          activeRides,
          completedRides,
          totalBookings,
          totalVehicles,
          systemStatus: 'HEALTHY',
          uptime: process.uptime(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all registered users for administration
   */
  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        include: {
          vehicles: true,
          _count: {
            select: {
              ridesDriven: true,
              requests: true,
              vehicles: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          phoneNumber: u.phoneNumber,
          isActive: u.isActive,
          createdAt: u.createdAt.toISOString(),
          vehicles: u.vehicles,
          stats: {
            ridesDriven: u._count.ridesDriven,
            requestsMade: u._count.requests,
            vehicles: u._count.vehicles,
          },
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update a user's role (Admin promotion/demotion)
   */
  static async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['PASSENGER', 'DRIVER', 'ADMIN'].includes(role)) {
        throw new AppError('Invalid role specified', 400, 'INVALID_ROLE');
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { role },
      });

      res.status(200).json({
        success: true,
        message: `User role updated to ${role}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all rides across the platform for administrative audit
   */
  static async getAllRides(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rides = await prisma.ride.findMany({
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              department: true,
            },
          },
          vehicle: true,
          _count: {
            select: { requests: true },
          },
        },
        orderBy: { departureTime: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: rides,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all vehicles registered in the platform garage
   */
  static async getAllVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicles = await prisma.vehicle.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
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
   * Suspend or reactivate a user account
   */
  static async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = UpdateUserStatusSchema.parse(req.body);

      if (id === req.user!.id) {
        throw new AppError('Admin cannot deactivate their own account', 400, 'SELF_DEACTIVATION');
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive },
      });

      res.status(200).json({
        success: true,
        message: `User account has been ${isActive ? 'activated' : 'suspended'}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin force cancels a flagged ride
   */
  static async forceCancelRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const ride = await prisma.ride.findUnique({
        where: { id },
        include: {
          driver: true,
          requests: {
            where: { status: { in: ['PENDING', 'APPROVED'] } },
          },
        },
      });

      if (!ride) {
        throw new AppError('Ride not found', 404, 'NOT_FOUND');
      }

      await prisma.$transaction(async (tx: any) => {
        await tx.ride.update({
          where: { id },
          data: { status: RideStatus.CANCELLED },
        });

        await tx.rideRequest.updateMany({
          where: { rideId: id, status: { in: ['PENDING', 'APPROVED'] } },
          data: { status: 'CANCELLED' },
        });
      });

      // Notify driver
      await NotificationService.sendNotification({
        userId: ride.driverId,
        title: 'Ride Terminated by Administrator',
        message: `Your ride from ${ride.origin} was removed by system administration due to policy compliance review.`,
        type: NotificationType.SYSTEM,
      });

      // Notify passengers
      for (const reqItem of ride.requests) {
        await NotificationService.sendNotification({
          userId: reqItem.passengerId,
          title: 'Ride Cancelled by Admin',
          message: `The ride to ${ride.destination} has been cancelled by system administration.`,
          type: NotificationType.RIDE_CANCELLED,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Ride forcefully cancelled by administrator',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin permanently deletes a ride
   */
  static async deleteRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const ride = await prisma.ride.findUnique({
        where: { id },
      });

      if (!ride) {
        throw new AppError('Ride not found', 404, 'NOT_FOUND');
      }

      await prisma.$transaction(async (tx: any) => {
        await tx.review.deleteMany({ where: { rideId: id } });
        await tx.rideRequest.deleteMany({ where: { rideId: id } });
        await tx.ride.delete({ where: { id } });
      });

      res.status(200).json({
        success: true,
        message: 'Ride deleted successfully by administrator',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin permanently deletes a vehicle
   */
  static async deleteVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
      }

      await prisma.$transaction(async (tx: any) => {
        const pastRides = await tx.ride.findMany({ where: { vehicleId: id }, select: { id: true } });
        const rideIds = pastRides.map((r: any) => r.id);
        if (rideIds.length > 0) {
          await tx.review.deleteMany({ where: { rideId: { in: rideIds } } });
          await tx.rideRequest.deleteMany({ where: { rideId: { in: rideIds } } });
          await tx.ride.deleteMany({ where: { id: { in: rideIds } } });
        }
        await tx.vehicle.delete({ where: { id } });
      });

      res.status(200).json({
        success: true,
        message: 'Vehicle deleted successfully by administrator',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin permanently deletes a user
   */
  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (id === req.user!.id) {
        throw new AppError('Admin cannot delete their own account', 400, 'SELF_DELETION');
      }

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }

      await prisma.user.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: 'User account deleted successfully by administrator',
      });
    } catch (err) {
      next(err);
    }
  }
}
