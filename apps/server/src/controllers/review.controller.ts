import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/error-handler';
import { CreateReviewSchema } from '@rideshare/shared';

export class ReviewController {
  /**
   * Submit a review for a participant in a completed ride
   */
  static async createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewerId = req.user!.id;
      const { rideId } = req.params;
      const data = CreateReviewSchema.parse(req.body);

      if (reviewerId === data.revieweeId) {
        throw new AppError('You cannot review yourself', 400, 'SELF_REVIEW_NOT_ALLOWED');
      }

      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          requests: {
            where: { status: 'APPROVED' },
          },
        },
      });

      if (!ride) {
        throw new AppError('Ride not found', 404, 'NOT_FOUND');
      }

      if (ride.status !== 'COMPLETED') {
        throw new AppError('Reviews can only be submitted after a ride is marked as completed', 400, 'RIDE_NOT_COMPLETED');
      }

      // Check reviewer participation: must be driver or approved passenger
      const isReviewerDriver = ride.driverId === reviewerId;
      const isReviewerPassenger = ride.requests.some((r) => r.passengerId === reviewerId);

      if (!isReviewerDriver && !isReviewerPassenger) {
        throw new AppError('Only verified participants of this ride can submit a review', 403, 'NOT_A_PARTICIPANT');
      }

      // Check reviewee participation
      const isRevieweeDriver = ride.driverId === data.revieweeId;
      const isRevieweePassenger = ride.requests.some((r) => r.passengerId === data.revieweeId);

      if (!isRevieweeDriver && !isRevieweePassenger) {
        throw new AppError('The target user was not a participant in this ride', 400, 'REVIEWEE_NOT_PARTICIPANT');
      }

      // Check for existing review
      const existing = await prisma.review.findFirst({
        where: {
          rideId,
          reviewerId,
          revieweeId: data.revieweeId,
        },
      });

      if (existing) {
        throw new AppError('You have already submitted a review for this participant on this ride', 409, 'ALREADY_REVIEWED');
      }

      const review = await prisma.review.create({
        data: {
          rideId,
          reviewerId,
          revieweeId: data.revieweeId,
          rating: data.rating,
          comment: data.comment?.trim() ?? null,
        },
        include: {
          reviewer: {
            select: { id: true, name: true, avatarUrl: true, department: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        data: review,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get reviews received by a user
   */
  static async getUserReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const reviews = await prisma.review.findMany({
        where: { revieweeId: userId },
        include: {
          reviewer: {
            select: { id: true, name: true, avatarUrl: true, department: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: reviews,
      });
    } catch (err) {
      next(err);
    }
  }
}
