import { z } from 'zod';
import { RequestStatus } from './types';

export const LoginSchema = z.object({
  email: z.string().trim().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.string().optional(),
});

export const RegisterSchema = z.object({
  email: z.string().trim().min(3, 'Email address is required').email('Please enter a valid email address (e.g. name@gmail.com)'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  role: z.enum(['PASSENGER', 'DRIVER', 'ADMIN']).default('PASSENGER'),
  department: z.string().max(100).optional().nullable().or(z.literal('')),
  phoneNumber: z.string().max(30).optional().nullable().or(z.literal('')),
});

export const DevLoginSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(['PASSENGER', 'DRIVER', 'ADMIN']).optional(),
});

export const GoogleLoginSchema = z.object({
  idToken: z.string().min(5, 'Google ID token is required'),
  role: z.enum(['PASSENGER', 'DRIVER', 'ADMIN']).optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  department: z.string().max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  bio: z.string().max(500).optional(),
});

export const CreateVehicleSchema = z.object({
  make: z.string().min(1, 'Make is required').max(50),
  model: z.string().min(1, 'Model is required').max(50),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().min(2).max(30),
  licensePlate: z.string().min(2).max(15),
  capacity: z.number().int().min(1).max(8),
});

export const CreateRideSchema = z.object({
  vehicleId: z.string().uuid('Valid vehicle ID required'),
  origin: z.string().min(2, 'Origin address is required').max(200),
  originLat: z.number().optional().nullable(),
  originLng: z.number().optional().nullable(),
  destination: z.string().min(2, 'Destination address is required').max(200),
  destLat: z.number().optional().nullable(),
  destLng: z.number().optional().nullable(),
  departureTime: z.string().datetime({ message: 'Must be a valid ISO datetime' }),
  totalSeats: z.number().int().min(1).max(8),
  pricePerSeat: z.number().min(0).max(10000).default(0),
  notes: z.string().max(500).optional().nullable(),
});

export const SearchRidesSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().optional(),
  date: z.string().optional(), // YYYY-MM-DD
  seats: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const CreateRideRequestSchema = z.object({
  seats: z.number().int().min(1).max(8).default(1),
  pickupNote: z.string().max(300).optional().nullable(),
});

export const UpdateRideRequestStatusSchema = z.object({
  action: z.enum(['APPROVE', 'DECLINE']),
});

export const CreateReviewSchema = z.object({
  revieweeId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().nullable(),
});

export const UpdateUserStatusSchema = z.object({
  isActive: z.boolean(),
});
