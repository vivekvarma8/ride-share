import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { AppError } from './error-handler';
export enum Role {
  PASSENGER = 'PASSENGER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role | any;
  isActive: boolean;
  department: string | null;
  avatarUrl: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('Authentication required. Missing or malformed token.', 401, 'UNAUTHORIZED'));
    return;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    next(new AppError('Invalid or expired authentication token.', 401, 'INVALID_TOKEN'));
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        department: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      next(new AppError('User account not found.', 401, 'USER_NOT_FOUND'));
      return;
    }

    if (!user.isActive) {
      next(new AppError('This user account has been deactivated. Please contact system admin.', 403, 'ACCOUNT_DEACTIVATED'));
      return;
    }

    req.user = user as any;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    return;
  }

  if (req.user.role !== Role.ADMIN) {
    next(new AppError('Access denied. Administrator privileges required.', 403, 'FORBIDDEN'));
    return;
  }

  next();
}

export function requireDriver(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    return;
  }

  if (req.user.role !== Role.DRIVER && req.user.role !== Role.ADMIN) {
    next(new AppError('Access denied. You must be registered as a Driver to perform this action.', 403, 'DRIVER_ROLE_REQUIRED'));
    return;
  }

  next();
}

