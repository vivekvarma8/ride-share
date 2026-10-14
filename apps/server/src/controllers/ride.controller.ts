import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error-handler';
import { NotificationService } from '../services/notification.service';
import { CreateRideSchema, SearchRidesSchema, NotificationType, RideStatus } from '@rideshare/shared';
import { Prisma } from '@prisma/client';
import { broadcastRideCreated, broadcastRideDeleted, broadcastRideStarted, broadcastRideLocation, broadcastPassengerBoarded, broadcastRideCompleted } from '../sockets/socket-handler';
import { MailService } from '../services/mail.service';

export class RideController {
  /**
   * Create a new ride listing
   */
  static async createRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.user!.id;
      const data = CreateRideSchema.parse(req.body);

      // Verify departure time is in the future
      const departureDate = new Date(data.departureTime);
      if (departureDate.getTime() <= Date.now()) {
        throw new AppError('Departure time must be in the future', 400, 'INVALID_DEPARTURE_TIME');
      }

      // Verify vehicle ownership and capacity
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: data.vehicleId },
      });

      if (!vehicle) {
        throw new AppError('Selected vehicle not found', 404, 'VEHICLE_NOT_FOUND');
      }

      if (vehicle.userId !== driverId) {
        throw new AppError('You can only offer rides with your own registered vehicles', 403, 'FORBIDDEN');
      }

      if (data.totalSeats > vehicle.capacity) {
        throw new AppError(
          `Offered seats (${data.totalSeats}) cannot exceed vehicle capacity (${vehicle.capacity})`,
          400,
          'SEAT_EXCEEDS_CAPACITY',
        );
      }

      const ride = await prisma.ride.create({
        data: {
          driverId,
          vehicleId: data.vehicleId,
          origin: data.origin.trim(),
          originLat: data.originLat ?? null,
          originLng: data.originLng ?? null,
          destination: data.destination.trim(),
          destLat: data.destLat ?? null,
          destLng: data.destLng ?? null,
          departureTime: departureDate,
          totalSeats: data.totalSeats,
          availableSeats: data.totalSeats,
          pricePerSeat: data.pricePerSeat,
          status: RideStatus.SCHEDULED,
          notes: data.notes?.trim() ?? null,
        },
        include: {
          vehicle: true,
          driver: {
            select: { id: true, name: true, email: true, avatarUrl: true, department: true },
          },
        },
      });

      // Broadcast newly created ride to all connected clients in real time
      broadcastRideCreated(ride);

      res.status(201).json({
        success: true,
        message: 'Ride published successfully',
        data: ride,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Search and filter rides
   */
  static async searchRides(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = SearchRidesSchema.parse(req.query);

      const whereClause: Prisma.RideWhereInput = {
        status: RideStatus.SCHEDULED,
        availableSeats: { gte: query.seats ?? 1 },
        departureTime: { gte: new Date() },
      };

      if (query.origin) {
        whereClause.origin = { contains: query.origin, mode: 'insensitive' };
      }

      if (query.destination) {
        whereClause.destination = { contains: query.destination, mode: 'insensitive' };
      }

      if (query.date) {
        const startOfDay = new Date(`${query.date}T00:00:00.000Z`);
        const endOfDay = new Date(`${query.date}T23:59:59.999Z`);
        whereClause.departureTime = {
          gte: startOfDay > new Date() ? startOfDay : new Date(),
          lte: endOfDay,
        };
      }

      if (req.query.excludeDriverId && typeof req.query.excludeDriverId === 'string') {
        whereClause.driverId = { not: req.query.excludeDriverId };
      }

      const skip = (query.page - 1) * query.limit;

      const [totalCount, rides] = await Promise.all([
        prisma.ride.count({ where: whereClause }),
        prisma.ride.findMany({
          where: whereClause,
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                department: true,
                reviewsReceived: { select: { rating: true } },
              },
            },
            vehicle: true,
          },
          orderBy: { departureTime: 'asc' },
          skip,
          take: query.limit,
        }),
      ]);

      const formattedRides = rides.map((r) => {
        const ratings = r.driver.reviewsReceived;
        const ratingAverage =
          ratings.length > 0
            ? Number((ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length).toFixed(1))
            : 5.0;

        return {
          id: r.id,
          driverId: r.driverId,
          driver: {
            id: r.driver.id,
            name: r.driver.name,
            email: r.driver.email,
            avatarUrl: r.driver.avatarUrl,
            department: r.driver.department,
            ratingAverage,
            totalReviews: ratings.length,
          },
          vehicleId: r.vehicleId,
          vehicle: r.vehicle,
          origin: r.origin,
          originLat: r.originLat,
          originLng: r.originLng,
          destination: r.destination,
          destLat: r.destLat,
          destLng: r.destLng,
          departureTime: r.departureTime.toISOString(),
          totalSeats: r.totalSeats,
          availableSeats: r.availableSeats,
          pricePerSeat: r.pricePerSeat,
          status: r.status,
          notes: r.notes,
          createdAt: r.createdAt.toISOString(),
        };
      });

      res.status(200).json({
        success: true,
        data: formattedRides,
        pagination: {
          page: query.page,
          limit: query.limit,
          totalCount,
          totalPages: Math.ceil(totalCount / query.limit) || 1,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single ride details
   */
  static async getRideById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const ride = await prisma.ride.findUnique({
        where: { id },
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              department: true,
              phoneNumber: true,
              bio: true,
              createdAt: true,
              reviewsReceived: { select: { rating: true } },
            },
          },
          vehicle: true,
          requests: {
            include: {
              passenger: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                  department: true,
                  phoneNumber: true,
                  reviewsReceived: { select: { rating: true } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!ride) {
        throw new AppError('Ride listing not found', 404, 'NOT_FOUND');
      }

      const driverRatings = ride.driver.reviewsReceived;
      const driverRatingAverage =
        driverRatings.length > 0
          ? Number((driverRatings.reduce((acc, curr) => acc + curr.rating, 0) / driverRatings.length).toFixed(1))
          : 5.0;

      res.status(200).json({
        success: true,
        data: {
          ...ride,
          driver: {
            ...ride.driver,
            ratingAverage: driverRatingAverage,
            totalReviews: driverRatings.length,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get rides where authenticated user is the driver
   */
  static async getMyDrives(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.user!.id;

      const rides = await prisma.ride.findMany({
        where: { driverId },
        include: {
          vehicle: true,
          requests: {
            include: {
              passenger: {
                select: { id: true, name: true, email: true, avatarUrl: true, department: true, phoneNumber: true },
              },
            },
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
   * Get rides where authenticated user is a passenger (requests made)
   */
  static async getMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const passengerId = req.user!.id;

      const requests = await prisma.rideRequest.findMany({
        where: { passengerId },
        include: {
          ride: {
            include: {
              driver: {
                select: { id: true, name: true, email: true, avatarUrl: true, department: true, phoneNumber: true },
              },
              vehicle: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Cancel ride by driver
   */
  static async cancelRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.user!.id;
      const { id } = req.params;

      const ride = await prisma.ride.findUnique({
        where: { id },
        include: {
          requests: {
            where: { status: { in: ['PENDING', 'APPROVED'] } },
            include: { passenger: true },
          },
        },
      });

      if (!ride) {
        throw new AppError('Ride not found', 404, 'NOT_FOUND');
      }

      if (ride.driverId !== driverId && req.user!.role !== 'ADMIN') {
        throw new AppError('Only the driver or an admin can cancel this ride', 403, 'FORBIDDEN');
      }

      if (ride.status === 'CANCELLED' || ride.status === 'COMPLETED') {
        throw new AppError(`Cannot cancel a ride that is already ${ride.status.toLowerCase()}`, 400, 'INVALID_STATUS');
      }

      // Execute transaction to update ride and requests atomically
      await prisma.$transaction(async (tx) => {
        await tx.ride.update({
          where: { id },
          data: { status: RideStatus.CANCELLED },
        });

        await tx.rideRequest.updateMany({
          where: {
            rideId: id,
            status: { in: ['PENDING', 'APPROVED'] },
          },
          data: { status: 'CANCELLED' },
        });
      });

      // Broadcast removal from available listings in real time
      broadcastRideDeleted(id);

      // Notify affected passengers
      for (const request of ride.requests) {
        await NotificationService.sendNotification({
          userId: request.passengerId,
          title: 'Ride Cancelled',
          message: `The ride from ${ride.origin} to ${ride.destination} scheduled for ${ride.departureTime.toLocaleDateString()} was cancelled by the driver.`,
          type: NotificationType.RIDE_CANCELLED,
          metadata: { rideId: ride.id },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Ride cancelled successfully and affected passengers have been notified.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Complete ride by driver
   */
  static async completeRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.user!.id;
      const { id } = req.params;

      const ride = await prisma.ride.findUnique({
        where: { id },
        include: {
          requests: {
            where: { status: 'APPROVED' },
          },
        },
      });

      if (!ride) {
        throw new AppError('Ride not found', 404, 'NOT_FOUND');
      }

      if (ride.driverId !== driverId) {
        throw new AppError('Only the driver can mark this ride as completed', 403, 'FORBIDDEN');
      }

      await prisma.ride.update({
        where: { id },
        data: { status: RideStatus.COMPLETED },
      });

      // Notify confirmed passengers to leave a review
      for (const reqItem of ride.requests) {
        await NotificationService.sendNotification({
          userId: reqItem.passengerId,
          title: 'Ride Completed - Rate Your Driver',
          message: `Your trip from ${ride.origin} has completed. Please leave a rating for your driver!`,
          type: NotificationType.SYSTEM,
          metadata: { rideId: ride.id, driverId: ride.driverId },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Ride marked as completed.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete ride by driver or admin
   */
  static async deleteRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const { id } = req.params;

      const ride = await prisma.ride.findUnique({
        where: { id },
        include: {
          requests: true,
        },
      });

      if (!ride) {
        throw new AppError('Ride not found', 404, 'NOT_FOUND');
      }

      if (ride.driverId !== userId && userRole !== 'ADMIN') {
        throw new AppError('You do not have permission to delete this ride', 403, 'FORBIDDEN');
      }

      await prisma.$transaction(async (tx) => {
        await tx.review.deleteMany({ where: { rideId: id } });
        await tx.rideRequest.deleteMany({ where: { rideId: id } });
        await tx.ride.delete({ where: { id } });
      });

      broadcastRideDeleted(id);

      res.status(200).json({
        success: true,
        message: 'Ride deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Driver verifies unique OTP provided by passenger before boarding
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.user!.id;
      const { id: rideId } = req.params;
      const { requestId, otp } = req.body;

      if (!requestId || !otp) {
        throw new AppError('Both requestId and passenger boarding OTP are required', 400, 'BAD_REQUEST');
      }

      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
      });

      if (!ride) {
        throw new AppError('Ride listing not found', 404, 'NOT_FOUND');
      }

      if (ride.driverId !== driverId && req.user!.role !== 'ADMIN') {
        throw new AppError('Only the assigned driver can verify passenger boarding OTP', 403, 'FORBIDDEN');
      }

      const request = await prisma.rideRequest.findUnique({
        where: { id: requestId },
        include: { passenger: true },
      });

      if (!request || request.rideId !== rideId) {
        throw new AppError('Passenger booking request not found for this ride', 404, 'NOT_FOUND');
      }

      if (request.status !== 'APPROVED') {
        throw new AppError(`Cannot verify OTP for a request that is ${request.status.toLowerCase()}`, 400, 'INVALID_STATE');
      }

      if (request.isBoarded) {
        res.status(200).json({
          success: true,
          message: 'Passenger has already been verified and boarded.',
          data: request,
        });
        return;
      }

      const cleanInputOtp = String(otp).trim();
      const storedOtp = String(request.otp || '').trim();

      if (cleanInputOtp !== storedOtp) {
        throw new AppError('Invalid boarding OTP. Please ask the passenger for their unique 4-digit OTP.', 400, 'INVALID_OTP');
      }

      // Mark passenger boarded
      const updatedRequest = await prisma.rideRequest.update({
        where: { id: requestId },
        data: {
          isBoarded: true,
          boardedAt: new Date(),
        },
        include: {
          passenger: {
            select: { id: true, name: true, email: true, phoneNumber: true, department: true, avatarUrl: true },
          },
        },
      });

      // Broadcast live event
      broadcastPassengerBoarded({
        rideId,
        requestId,
        passengerId: request.passengerId,
      });

      // Notify passenger
      await NotificationService.sendNotification({
        userId: request.passengerId,
        title: 'Boarding Verified!',
        message: `Your driver ${req.user!.name} has verified your OTP. Have a pleasant trip!`,
        type: NotificationType.SYSTEM,
        metadata: { rideId, requestId },
      });

      res.status(200).json({
        success: true,
        message: `Boarding verified successfully for ${request.passenger.name}!`,
        data: updatedRequest,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Driver starts the scheduled ride
   */
  static async startRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.user!.id;
      const { id } = req.params;

      const ride = await prisma.ride.findUnique({
        where: { id },
        include: {
          requests: {
            where: { status: 'APPROVED' },
            include: { passenger: true },
          },
          vehicle: true,
          driver: { select: { id: true, name: true, email: true, phoneNumber: true } },
        },
      });

      if (!ride) {
        throw new AppError('Ride not found', 404, 'NOT_FOUND');
      }

      if (ride.driverId !== driverId && req.user!.role !== 'ADMIN') {
        throw new AppError('Only the driver can start this ride', 403, 'FORBIDDEN');
      }

      if (ride.status === 'IN_PROGRESS') {
        res.status(200).json({
          success: true,
          message: 'Ride is already in progress',
          data: ride,
        });
        return;
      }

      if (ride.status !== 'SCHEDULED') {
        throw new AppError(`Cannot start a ride that is ${ride.status.toLowerCase()}`, 400, 'INVALID_STATUS');
      }

      const updatedRide = await prisma.ride.update({
        where: { id },
        data: {
          status: RideStatus.IN_PROGRESS,
          startedAt: new Date(),
          currentLat: ride.originLat,
          currentLng: ride.originLng,
        },
        include: {
          vehicle: true,
          driver: { select: { id: true, name: true, email: true, avatarUrl: true, department: true } },
          requests: {
            include: { passenger: true },
          },
        },
      });

      // Broadcast live event to all connected clients
      broadcastRideStarted(updatedRide);

      // Dispatch automated notification and emails to all confirmed passengers
      for (const reqItem of ride.requests) {
        await NotificationService.sendNotification({
          userId: reqItem.passengerId,
          title: 'Ride Officially Started!',
          message: `Your driver ${ride.driver.name} has started the ride from ${ride.origin} to ${ride.destination}. Track live on your dashboard.`,
          type: NotificationType.SYSTEM,
          metadata: { rideId: ride.id },
        });

        MailService.sendRideStartedEmail({
          to: reqItem.passenger.email,
          passengerName: reqItem.passenger.name,
          origin: ride.origin,
          destination: ride.destination,
          driverName: ride.driver.name,
          rideId: ride.id,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Ride started successfully! Live GPS tracking is active.',
        data: updatedRide,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update live vehicle GPS location during an active trip
   */
  static async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.user!.id;
      const { id } = req.params;
      const { lat, lng } = req.body;

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        throw new AppError('Valid lat and lng numbers are required', 400, 'BAD_REQUEST');
      }

      const ride = await prisma.ride.findUnique({ where: { id } });
      if (!ride) throw new AppError('Ride not found', 404, 'NOT_FOUND');

      if (ride.driverId !== driverId && req.user!.role !== 'ADMIN') {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }

      await prisma.ride.update({
        where: { id },
        data: { currentLat: lat, currentLng: lng },
      });

      broadcastRideLocation(id, lat, lng);

      res.status(200).json({ success: true, data: { lat, lng } });
    } catch (err) {
      next(err);
    }
  }
}
