import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/user/:userId', ReviewController.getUserReviews);
router.post('/ride/:rideId', requireAuth, ReviewController.createReview);

export default router;
