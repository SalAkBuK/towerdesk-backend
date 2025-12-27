import { Injectable, NotFoundException } from '@nestjs/common';
import { resolvePagination } from '../../common/utils/pagination';
import { DbClient } from '../../infra/prisma/db-client';
import { NotificationTypeEnum } from './notifications.constants';
import { NotificationsRepo, NotificationInput } from './notifications.repo';

type RequestSnapshot = {
  id: string;
  orgId: string;
  buildingId: string;
  unitId?: string | null;
  title: string;
  status?: string | null;
  createdByUserId: string;
  assignedToUserId?: string | null;
  unit?: { id: string; label: string } | null;
};

type CommentSnapshot = {
  id: string;
  message: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepo: NotificationsRepo,
  ) {}

  async listForUser(
    userId: string,
    orgId: string,
    options: { unreadOnly?: boolean; cursor?: string; limit?: number },
  ) {
    const { take } = resolvePagination(options.limit, 0);
    let cursorInfo: { id: string; createdAt: Date } | undefined;

    if (options.cursor) {
      const cursorRecord = await this.notificationsRepo.findByIdForUser(
        options.cursor,
        userId,
        orgId,
      );
      if (!cursorRecord) {
        throw new NotFoundException('Notification not found');
      }
      cursorInfo = { id: cursorRecord.id, createdAt: cursorRecord.createdAt };
    }

    return this.notificationsRepo.listForUser(userId, orgId, {
      unreadOnly: options.unreadOnly,
      limit: take,
      cursor: cursorInfo,
    });
  }

  async markRead(notificationId: string, userId: string, orgId: string) {
    const updated = await this.notificationsRepo.markRead(
      notificationId,
      userId,
      orgId,
    );
    if (updated === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  async markAllRead(userId: string, orgId: string) {
    await this.notificationsRepo.markAllRead(userId, orgId);
  }

  async notifyRequestCreated(
    tx: DbClient,
    request: RequestSnapshot,
    actorUserId: string,
  ) {
    const recipients = await this.getBuildingManagersAndAdmins(
      tx,
      request.buildingId,
      request.orgId,
    );
    this.removeActor(recipients, actorUserId);

    return this.notificationsRepo.createMany(
      this.buildNotifications(
        recipients,
        request,
        actorUserId,
        NotificationTypeEnum.REQUEST_CREATED,
        'New maintenance request',
        this.buildRequestBody(request),
      ),
      tx,
    );
  }

  async notifyRequestAssigned(
    tx: DbClient,
    request: RequestSnapshot,
    actorUserId: string,
  ) {
    const recipients = new Set<string>();
    if (request.assignedToUserId) {
      recipients.add(request.assignedToUserId);
    }
    recipients.add(request.createdByUserId);

    const managers = await this.getBuildingManagersAndAdmins(
      tx,
      request.buildingId,
      request.orgId,
    );
    managers.forEach((id) => recipients.add(id));

    this.removeActor(recipients, actorUserId);

    return this.notificationsRepo.createMany(
      this.buildNotifications(
        recipients,
        request,
        actorUserId,
        NotificationTypeEnum.REQUEST_ASSIGNED,
        'Request assigned',
        this.buildRequestBody(request),
      ),
      tx,
    );
  }

  async notifyRequestStatusChanged(
    tx: DbClient,
    request: RequestSnapshot,
    actorUserId: string,
  ) {
    const recipients = new Set<string>([request.createdByUserId]);
    this.removeActor(recipients, actorUserId);

    return this.notificationsRepo.createMany(
      this.buildNotifications(
        recipients,
        request,
        actorUserId,
        NotificationTypeEnum.REQUEST_STATUS_CHANGED,
        'Request status updated',
        request.status ?? undefined,
      ),
      tx,
    );
  }

  async notifyRequestCommented(
    tx: DbClient,
    request: RequestSnapshot,
    comment: CommentSnapshot,
    actorUserId: string,
    actorIsResident: boolean,
  ) {
    const recipients = new Set<string>();

    if (actorIsResident) {
      const managers = await this.getBuildingManagersAndAdmins(
        tx,
        request.buildingId,
        request.orgId,
      );
      managers.forEach((id) => recipients.add(id));
      if (request.assignedToUserId) {
        recipients.add(request.assignedToUserId);
      }
    } else {
      recipients.add(request.createdByUserId);
    }

    this.removeActor(recipients, actorUserId);

    return this.notificationsRepo.createMany(
      this.buildNotifications(
        recipients,
        request,
        actorUserId,
        NotificationTypeEnum.REQUEST_COMMENTED,
        'New comment',
        this.truncateMessage(comment.message),
        { commentId: comment.id },
      ),
      tx,
    );
  }

  async notifyRequestCanceled(
    tx: DbClient,
    request: RequestSnapshot,
    actorUserId: string,
  ) {
    const recipients = await this.getBuildingManagersAndAdmins(
      tx,
      request.buildingId,
      request.orgId,
    );
    if (request.assignedToUserId) {
      recipients.add(request.assignedToUserId);
    }
    this.removeActor(recipients, actorUserId);

    return this.notificationsRepo.createMany(
      this.buildNotifications(
        recipients,
        request,
        actorUserId,
        NotificationTypeEnum.REQUEST_CANCELED,
        'Request canceled',
        this.buildRequestBody(request),
      ),
      tx,
    );
  }

  private async getBuildingManagersAndAdmins(
    tx: DbClient,
    buildingId: string,
    orgId: string,
  ) {
    const prisma = tx as any;
    const assignments = await prisma.buildingAssignment.findMany({
      where: {
        buildingId,
        type: { in: ['MANAGER', 'BUILDING_ADMIN'] },
      },
      include: { user: true },
    });

    const recipients = new Set<string>();
    for (const assignment of assignments) {
      const user = assignment.user;
      if (user && user.isActive && user.orgId === orgId) {
        recipients.add(assignment.userId);
      }
    }
    return recipients;
  }

  private buildRequestBody(request: RequestSnapshot) {
    const label = request.unit?.label;
    if (!label) {
      return request.title;
    }
    return `Unit ${label}: ${request.title}`;
  }

  private buildNotifications(
    recipients: Set<string>,
    request: RequestSnapshot,
    actorUserId: string,
    type: NotificationTypeEnum,
    title: string,
    body?: string,
    extraData?: Record<string, unknown>,
  ): NotificationInput[] {
    const notifications: NotificationInput[] = [];
    const unitId = request.unit?.id ?? request.unitId ?? null;

    for (const recipientUserId of recipients) {
      notifications.push({
        orgId: request.orgId,
        recipientUserId,
        type,
        title,
        body: body ?? null,
        data: {
          requestId: request.id,
          buildingId: request.buildingId,
          unitId,
          actorUserId,
          status: request.status ?? undefined,
          ...(extraData ?? {}),
        },
      });
    }

    return notifications;
  }

  private truncateMessage(message: string) {
    const trimmed = message.trim();
    if (trimmed.length <= 80) {
      return trimmed;
    }
    return `${trimmed.slice(0, 77)}...`;
  }

  private removeActor(recipients: Set<string>, actorUserId: string) {
    recipients.delete(actorUserId);
  }
}
