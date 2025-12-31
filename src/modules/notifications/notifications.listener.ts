import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  MaintenanceRequestEventPayload,
  MAINTENANCE_REQUEST_EVENTS,
  MaintenanceRequestSnapshot,
} from '../maintenance-requests/maintenance-requests.events';
import { NotificationTypeEnum } from './notifications.constants';
import { NotificationsService } from './notifications.service';
import { NotificationRecipientResolver } from './notification-recipient.resolver';

@Injectable()
export class NotificationsListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly recipientResolver: NotificationRecipientResolver,
  ) {}

  @OnEvent(MAINTENANCE_REQUEST_EVENTS.CREATED)
  async handleRequestCreated(payload: MaintenanceRequestEventPayload) {
    const recipients = await this.recipientResolver.resolveForRequestCreated(
      payload.request,
      payload.actorUserId,
    );

    await this.notificationsService.createForUsers({
      orgId: payload.request.orgId,
      userIds: Array.from(recipients),
      type: NotificationTypeEnum.REQUEST_CREATED,
      title: 'New maintenance request',
      body: this.buildRequestBody(payload.request),
      data: this.buildNotificationData(payload),
    });
  }

  @OnEvent(MAINTENANCE_REQUEST_EVENTS.ASSIGNED)
  async handleRequestAssigned(payload: MaintenanceRequestEventPayload) {
    const recipients = await this.recipientResolver.resolveForRequestAssigned(
      payload.request,
      payload.actorUserId,
    );

    await this.notificationsService.createForUsers({
      orgId: payload.request.orgId,
      userIds: Array.from(recipients),
      type: NotificationTypeEnum.REQUEST_ASSIGNED,
      title: 'Request assigned',
      body: this.buildRequestBody(payload.request),
      data: this.buildNotificationData(payload),
    });
  }

  @OnEvent(MAINTENANCE_REQUEST_EVENTS.STATUS_CHANGED)
  async handleRequestStatusChanged(payload: MaintenanceRequestEventPayload) {
    const recipients =
      await this.recipientResolver.resolveForRequestStatusChanged(
        payload.request,
        payload.actorUserId,
      );

    await this.notificationsService.createForUsers({
      orgId: payload.request.orgId,
      userIds: Array.from(recipients),
      type: NotificationTypeEnum.REQUEST_STATUS_CHANGED,
      title: 'Request status updated',
      body: payload.request.status ?? undefined,
      data: this.buildNotificationData(payload),
    });
  }

  @OnEvent(MAINTENANCE_REQUEST_EVENTS.COMMENTED)
  async handleRequestCommented(payload: MaintenanceRequestEventPayload) {
    const recipients = await this.recipientResolver.resolveForRequestCommented(
      payload.request,
      payload.actorUserId,
      payload.actorIsResident ?? false,
    );

    await this.notificationsService.createForUsers({
      orgId: payload.request.orgId,
      userIds: Array.from(recipients),
      type: NotificationTypeEnum.REQUEST_COMMENTED,
      title: 'New comment',
      body: payload.comment
        ? this.truncateMessage(payload.comment.message)
        : undefined,
      data: this.buildNotificationData(payload),
    });
  }

  @OnEvent(MAINTENANCE_REQUEST_EVENTS.CANCELED)
  async handleRequestCanceled(payload: MaintenanceRequestEventPayload) {
    const recipients = await this.recipientResolver.resolveForRequestCanceled(
      payload.request,
      payload.actorUserId,
    );

    await this.notificationsService.createForUsers({
      orgId: payload.request.orgId,
      userIds: Array.from(recipients),
      type: NotificationTypeEnum.REQUEST_CANCELED,
      title: 'Request canceled',
      body: this.buildRequestBody(payload.request),
      data: this.buildNotificationData(payload),
    });
  }

  private buildRequestBody(request: MaintenanceRequestSnapshot) {
    const label = request.unit?.label;
    if (!label) {
      return request.title;
    }
    return `Unit ${label}: ${request.title}`;
  }

  private buildNotificationData(payload: MaintenanceRequestEventPayload) {
    const request = payload.request;
    const unitId = request.unit?.id ?? request.unitId ?? null;
    return {
      requestId: request.id,
      buildingId: request.buildingId,
      unitId,
      actorUserId: payload.actorUserId,
      status: request.status ?? undefined,
      commentId: payload.comment?.id,
    };
  }

  private truncateMessage(message: string) {
    const trimmed = message.trim();
    if (trimmed.length <= 80) {
      return trimmed;
    }
    return `${trimmed.slice(0, 77)}...`;
  }
}
