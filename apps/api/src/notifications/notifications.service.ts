import { Inject, Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { MAILER, Mailer } from './mailer/mailer.interface';

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  alsoEmail?: boolean;
}

/**
 * Multi-channel notifications. In-app notifications are persisted rows the user
 * can list/mark read; email is sent via the Mailer abstraction. The method is
 * tolerant: a failed email never prevents the in-app notification from being
 * stored. The data payload is non-sensitive and used only for deep links.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  async notify(input: NotifyInput): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: input.userId,
        channel: NotificationChannel.IN_APP,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ? (input.data as object) : undefined,
        status: NotificationStatus.SENT,
      },
    });

    if (input.alsoEmail) {
      const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
      if (user?.email && !user.email.endsWith('@rentrust.invalid')) {
        await this.mailer.send({ to: user.email, subject: input.title, text: input.body });
      }
    }
  }

  listForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }
}
