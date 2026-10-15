import { prisma } from '../utils/prisma';
import { emitNotificationToUser } from '../sockets/socket-handler';
import { NotificationType, NotificationItem } from '@rideshare/shared';
import { Prisma } from '@prisma/client';

export class NotificationService {
  /**
   * Persists a notification to the database and dispatches it in real-time via Socket.IO
   */
  static async sendNotification(params: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    metadata?: Record<string, unknown>;
  }): Promise<NotificationItem> {
    const { userId, title, message, type, metadata } = params;

    const notif = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });

    const item: NotificationItem = {
      id: notif.id,
      userId: notif.userId,
      title: notif.title,
      message: notif.message,
      type: notif.type as NotificationType,
      metadata: notif.metadata as Record<string, unknown> | null,
      isRead: notif.isRead,
      createdAt: notif.createdAt.toISOString(),
    };

    // Emit in real-time
    emitNotificationToUser(userId, item);

    return item;
  }

  /**
   * Retrieves notifications for a given user
   */
  static async getUserNotifications(userId: string, limit = 50) {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      notifications: notifications.map((n: any) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type,
        metadata: n.metadata,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    };
  }

  /**
   * Mark a specific notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
