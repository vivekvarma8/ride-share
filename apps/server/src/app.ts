import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { notFoundHandler, globalErrorHandler } from './middleware/error-handler';

// Routers
import authRoutes from './routes/auth.routes';
import vehicleRoutes from './routes/vehicle.routes';
import rideRoutes from './routes/ride.routes';
import reviewRoutes from './routes/review.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes from './routes/admin.routes';
import locationRoutes from './routes/location.routes';

const app = express();

// Security Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      // In development, permit requests from any local origin (localhost, 127.0.0.1 on any port) or configured clientUrl
      if (
        !origin ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.startsWith('https://localhost') ||
        origin.startsWith('https://127.0.0.1') ||
        origin === config.clientUrl
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all during development
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for Auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Generous for dev & test runs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'UP',
      timestamp: new Date().toISOString(),
      allowedDomains: config.allowedEmailDomains,
    },
  });
});

// Route Mounts
app.use(['/api/auth', '/auth'], authLimiter, authRoutes);
app.use(['/api/vehicles', '/vehicles'], vehicleRoutes);
app.use(['/api/rides', '/rides'], rideRoutes);
app.use(['/api/reviews', '/reviews'], reviewRoutes);
app.use(['/api/locations', '/locations'], locationRoutes);
app.use(['/api/notifications', '/notifications'], notificationRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
