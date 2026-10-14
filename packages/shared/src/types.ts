export enum UserRole {
  PASSENGER = 'PASSENGER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

export enum RideStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum NotificationType {
  RIDE_REQUEST = 'RIDE_REQUEST',
  REQUEST_APPROVED = 'REQUEST_APPROVED',
  REQUEST_DECLINED = 'REQUEST_DECLINED',
  RIDE_CANCELLED = 'RIDE_CANCELLED',
  SYSTEM = 'SYSTEM',
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  department: string | null;
  phoneNumber: string | null;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  ratingAverage?: number;
  totalReviews?: number;
}

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  capacity: number;
  createdAt: string;
}

export interface Ride {
  id: string;
  driverId: string;
  driver?: UserSummary;
  vehicleId: string;
  vehicle?: Vehicle;
  origin: string;
  originLat: number | null;
  originLng: number | null;
  destination: string;
  destLat: number | null;
  destLng: number | null;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  status: RideStatus;
  notes: string | null;
  createdAt: string;
  requests?: RideRequest[];
}

export interface RideRequest {
  id: string;
  rideId: string;
  ride?: Ride;
  passengerId: string;
  passenger?: UserSummary;
  seats: number;
  status: RequestStatus;
  pickupNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  rideId: string;
  reviewerId: string;
  reviewer?: UserSummary;
  revieweeId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface AuthSession {
  token: string;
  user: UserSummary;
}
