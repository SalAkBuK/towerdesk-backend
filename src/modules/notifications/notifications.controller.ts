import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgScopeGuard } from '../../common/guards/org-scope.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications.query.dto';
import {
  NotificationsListResponseDto,
} from './dto/notifications-list.response.dto';
import { toNotificationResponse } from './dto/notification.response.dto';
import { NotificationActionResponseDto } from './dto/notification-action.response.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrgScopeGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOkResponse({ type: NotificationsListResponseDto })
  async list(
    @CurrentUser('sub') userId: string,
    @CurrentUser('orgId') orgId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    const { items, nextCursor } = await this.notificationsService.listForUser(
      userId,
      orgId,
      {
        unreadOnly: query.unreadOnly,
        includeDismissed: query.includeDismissed,
        cursor: query.cursor,
        limit: query.limit,
      },
    );

    return {
      items: items.map(toNotificationResponse),
      nextCursor,
    };
  }

  @Post(':id/read')
  @ApiOkResponse({ type: NotificationActionResponseDto })
  async markRead(
    @CurrentUser('sub') userId: string,
    @CurrentUser('orgId') orgId: string,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.markRead(notificationId, userId, orgId);
    return { success: true };
  }

  @Post('read-all')
  @ApiOkResponse({ type: NotificationActionResponseDto })
  async markAllRead(
    @CurrentUser('sub') userId: string,
    @CurrentUser('orgId') orgId: string,
  ) {
    await this.notificationsService.markAllRead(userId, orgId);
    return { success: true };
  }

  @Post(':id/dismiss')
  @ApiOkResponse({ type: NotificationActionResponseDto })
  async dismiss(
    @CurrentUser('sub') userId: string,
    @CurrentUser('orgId') orgId: string,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.dismiss(notificationId, userId, orgId);
    return { success: true };
  }

  @Post(':id/undismiss')
  @ApiOkResponse({ type: NotificationActionResponseDto })
  async undismiss(
    @CurrentUser('sub') userId: string,
    @CurrentUser('orgId') orgId: string,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.undismiss(notificationId, userId, orgId);
    return { success: true };
  }
}
