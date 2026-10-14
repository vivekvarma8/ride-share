import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { NotificationItem } from '@rideshare/shared';

let ioInstance: SocketIOServer | null = null;

export function setupSocketIO(io: SocketIOServer): void {
  ioInstance = io;

  // Socket authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required for WebSocket connection'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid or expired WebSocket token'));
    }

    // Attach user information to socket data
    socket.data.userId = decoded.userId;
    socket.data.email = decoded.email;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    const roomName = `user:${userId}`;

    socket.join(roomName);
    console.log(`[Socket.IO] User ${userId} connected and joined room ${roomName}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User ${userId} disconnected`);
    });
  });
}

export function emitNotificationToUser(userId: string, notification: NotificationItem): boolean {
  if (!ioInstance) {
    console.warn('[Socket.IO] Warning: Attempted to emit notification before Socket.IO was initialized.');
    return false;
  }

  const roomName = `user:${userId}`;
  ioInstance.to(roomName).emit('notification:new', notification);
  return true;
}

export function broadcastRideCreated(ride: any): boolean {
  if (!ioInstance) return false;
  ioInstance.emit('ride:created', ride);
  return true;
}

export function broadcastRideDeleted(rideId: string): boolean {
  if (!ioInstance) return false;
  ioInstance.emit('ride:deleted', { rideId });
  return true;
}

export function broadcastRideStarted(ride: any): boolean {
  if (!ioInstance) return false;
  ioInstance.emit('ride:started', ride);
  return true;
}

export function broadcastRideLocation(rideId: string, lat: number, lng: number): boolean {
  if (!ioInstance) return false;
  ioInstance.emit('ride:location', { rideId, lat, lng });
  return true;
}

export function broadcastPassengerBoarded(payload: { rideId: string; requestId: string; passengerId: string }): boolean {
  if (!ioInstance) return false;
  ioInstance.emit('passenger:boarded', payload);
  return true;
}

export function broadcastRideCompleted(rideId: string): boolean {
  if (!ioInstance) return false;
  ioInstance.emit('ride:completed', { rideId });
  return true;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}
