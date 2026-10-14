import { MailService } from '../services/mail.service';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error-handler';
import { NotificationService } from '../services/notification.service';
import {
  CreateRideRequestSchema,
  UpdateRideRequestStatusSchema,
  RequestStatus,
  NotificationType,
} from '@rideshare/shared';

export class RequestController {
  /**
   * Submit a request to join a ride
   */
  static async createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const passengerId = req.user!.id;
      const { rideId } = req.params;
      const data = CreateRideRequestSchema.parse(req.body);

      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: { driver: true },
      });

      if (!ride) {
        throw new AppError('Ride not found', 404, 'NOT_FOUND');
      }

      if (ride.driverId === passengerId) {
        throw new AppError('You cannot request to join your own ride', 400, 'CANNOT_JOIN_OWN_RIDE');
      }

      if (ride.status !== 'SCHEDULED') {
        throw new AppError('This ride is not accepting new requests', 400, 'RIDE_NOT_SCHEDULED');
      }

      if (ride.availableSeats < data.seats) {
        throw new AppError(
          `Only ${ride.availableSeats} seat(s) available. Cannot request ${data.seats} seat(s).`,
          400,
          'INSUFFICIENT_SEATS',
        );
      }

      // Check for existing pending or approved request from this passenger
      const existingRequest = await prisma.rideRequest.findFirst({
        where: {
          rideId,
          passengerId,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      });

      if (existingRequest) {
        throw new AppError(
          `You already have an active ${existingRequest.status.toLowerCase()} request for this ride`,
          409,
          'DUPLICATE_REQUEST',
        );
      }

      const rideRequest = await prisma.rideRequest.create({
        data: {
          rideId,
          passengerId,
          seats: data.seats,
          pickupNote: data.pickupNote?.trim() ?? null,
          status: RequestStatus.PENDING,
        },
        include: {
          passenger: {
            select: { id: true, name: true, email: true, avatarUrl: true, department: true },
          },
        },
      });

      // Notify driver in real-time
      await NotificationService.sendNotification({
        userId: ride.driverId,
        title: 'New Join Request',
        message: `${req.user!.name} requested ${data.seats} seat(s) for your ride to ${ride.destination}.`,
        type: NotificationType.RIDE_REQUEST,
        metadata: {
          rideId: ride.id,
          requestId: rideRequest.id,
          passengerName: req.user!.name,
          seats: data.seats,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Join request sent to driver for approval',
        data: rideRequest,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Driver approves or declines a join request (Atomic seat locking)
   */
  static async updateRequestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.user!.id;
      const { rideId, requestId } = req.params;
      const { action } = UpdateRideRequestStatusSchema.parse(req.body);

      const request = await prisma.rideRequest.findUnique({
        where: { id: requestId },
        include: {
          ride: true,
          passenger: true,
        },
      });

      if (!request || request.rideId !== rideId) {
        throw new AppError('Join request not found for this ride', 404, 'NOT_FOUND');
      }

      if (request.ride.driverId !== driverId) {
        throw new AppError('Only the driver can approve or decline requests', 403, 'FORBIDDEN');
      }

      if (request.status !== RequestStatus.PENDING) {
        throw new AppError(
          `Cannot change status of a request that is already ${request.status.toLowerCase()}`,
          400,
          'INVALID_STATE',
        );
      }

      if (action === 'APPROVE') {
        // Atomic seat reservation inside transaction
        const updated = await prisma.$transaction(async (tx) => {
          // Re-fetch ride with current availableSeats
          const currentRide = await tx.ride.findUnique({
            where: { id: rideId },
          });

          if (!currentRide) {
            throw new AppError('Ride not found', 404, 'NOT_FOUND');
          }

          if (currentRide.status !== 'SCHEDULED') {
            throw new AppError('Ride is no longer active', 400, 'RIDE_NOT_ACTIVE');
          }

          if (currentRide.availableSeats < request.seats) {
            throw new AppError(
              `Cannot approve: not enough seats left (${currentRide.availableSeats} available, ${request.seats} requested)`,
              400,
              'SEATS_EXHAUSTED',
            );
          }

          // Decrement available seats
          await tx.ride.update({
            where: { id: rideId },
            data: {
              availableSeats: currentRide.availableSeats - request.seats,
            },
          });

          // Generate unique 4-digit boarding OTP (Uber/Rapido style)
          const boardingOtp = Math.floor(1000 + Math.random() * 9000).toString();

          // Update request to APPROVED with unique OTP
          return tx.rideRequest.update({
            where: { id: requestId },
            data: { 
              status: RequestStatus.APPROVED,
              otp: boardingOtp,
              isBoarded: false
            },
            include: { passenger: true, ride: true },
          });
        });

        // Fetch vehicle info for pass
        const rideWithDetails = await prisma.ride.findUnique({
          where: { id: rideId },
          include: { vehicle: true },
        });

        const boardingOtp = updated.otp || '0000';

        // Notify passenger of approval with OTP
        await NotificationService.sendNotification({
          userId: request.passengerId,
          title: `Request Approved! Boarding OTP: ${boardingOtp}`,
          message: `Your request was approved by ${req.user!.name}! Your unique Boarding OTP is ${boardingOtp}. Share this with driver when boarding.`,
          type: NotificationType.REQUEST_APPROVED,
          metadata: {
            rideId: request.rideId,
            requestId: request.id,
            otp: boardingOtp,
          },
        });

        // Dispatch automated Boarding OTP email via Nodemailer
        MailService.sendBookingOtpEmail({
          to: request.passenger.email,
          passengerName: request.passenger.name,
          origin: request.ride.origin,
          destination: request.ride.destination,
          departureTime: new Date(request.ride.departureTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
          otp: boardingOtp,
          driverName: req.user!.name,
          vehicleInfo: rideWithDetails?.vehicle ? `${rideWithDetails.vehicle.make} ${rideWithDetails.vehicle.model} (${rideWithDetails.vehicle.licensePlate})` : 'Registered Vehicle',
        });

        res.status(200).json({
          success: true,
          message: 'Request approved successfully',
          data: updated,
        });
        return;
      }

      if (action === 'DECLINE') {
        const updated = await prisma.rideRequest.update({
          where: { id: requestId },
          data: { status: RequestStatus.REJECTED },
          include: { passenger: true, ride: true },
        });

        // Notify passenger of decline
        await NotificationService.sendNotification({
          userId: request.passengerId,
          title: 'Request Declined',
          message: `Your request for the ride to ${request.ride.destination} could not be accepted.`,
          type: NotificationType.REQUEST_DECLINED,
          metadata: {
            rideId: request.rideId,
            requestId: request.id,
          },
        });

        res.status(200).json({
          success: true,
          message: 'Request declined',
          data: updated,
        });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Passenger cancels their join request
   */
  static async cancelRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const passengerId = req.user!.id;
      const { rideId, requestId } = req.params;

      const request = await prisma.rideRequest.findUnique({
        where: { id: requestId },
        include: { ride: true },
      });

      if (!request || request.rideId !== rideId) {
        throw new AppError('Request not found', 404, 'NOT_FOUND');
      }

      if (request.passengerId !== passengerId) {
        throw new AppError('You can only cancel your own requests', 403, 'FORBIDDEN');
      }

      if (request.status === 'CANCELLED' || request.status === 'REJECTED') {
        throw new AppError(`Request is already ${request.status.toLowerCase()}`, 400, 'INVALID_STATE');
      }

      // If approved, restore seats atomically
      const wasApproved = request.status === RequestStatus.APPROVED;

      await prisma.$transaction(async (tx) => {
        await tx.rideRequest.update({
          where: { id: requestId },
          data: { status: RequestStatus.CANCELLED },
        });

        if (wasApproved) {
          await tx.ride.update({
            where: { id: rideId },
            data: {
              availableSeats: { increment: request.seats },
            },
          });
        }
      });

      // Notify driver of cancellation
      await NotificationService.sendNotification({
        userId: request.ride.driverId,
        title: 'Passenger Cancelled Request',
        message: `${req.user!.name} cancelled their booking for your ride to ${request.ride.destination}.`,
        type: NotificationType.SYSTEM,
        metadata: { rideId: request.rideId, requestId: request.id },
      });

      res.status(200).json({
        success: true,
        message: 'Join request cancelled successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
