import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DbClient } from '../../infra/prisma/db-client';
import { NotificationTypeEnum } from './notifications.constants';

export type NotificationInput = {
  orgId: string;
  recipientUserId: string;
  type: NotificationTypeEnum;
  title: string;
  body?: string | null;
  data: Record<string, unknown>;
};

type CursorInfo = {
  id: string;
  createdAt: Date;
};

@Injectable()
export class NotificationsRepo {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(notifications: NotificationInput[], tx?: DbClient) {
    if (notifications.length === 0) {
      return { count: 0 };
    }
    const prisma = (tx ?? this.prisma) as any;
    return prisma.notification.createMany({
      data: notifications.map((notification) => ({
        ...notification,
        body: notification.body ?? null,
      })),
    });
  }

  findByIdForUser(notificationId: string, userId: string, orgId: string) {
    const prisma = this.prisma as any;
    return prisma.notification.findFirst({
      where: { id: notificationId, recipientUserId: userId, orgId },
    });
  }

  async listForUser(
    userId: string,
    orgId: string,
    options: { unreadOnly?: boolean; limit: number; cursor?: CursorInfo },
  ) {
    const prisma = this.prisma as any;
    const where: Record<string, unknown> = {
      orgId,
      recipientUserId: userId,
    };
    if (options.unreadOnly) {
      where.readAt = null;
    }
    if (options.cursor) {
      where.OR = [
        { createdAt: { lt: options.cursor.createdAt } },
        {
          createdAt: options.cursor.createdAt,
          id: { lt: options.cursor.id },
        },
      ];
    }

    const items = await prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit,
    });

    const nextCursor =
      items.length === options.limit ? items[items.length - 1].id : undefined;

    return { items, nextCursor };
  }

  async markRead(notificationId: string, userId: string, orgId: string) {
    const prisma = this.prisma as any;
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, recipientUserId: userId, orgId },
      data: { readAt: new Date() },
    });
    return result.count as number;
  }

  async markAllRead(userId: string, orgId: string) {
    const prisma = this.prisma as any;
    const result = await prisma.notification.updateMany({
      where: { recipientUserId: userId, orgId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count as number;
  }
}
