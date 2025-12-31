import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { DevNotificationsController } from './dev-notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepo } from './notifications.repo';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsRealtimeService } from './notifications-realtime.service';
import { NotificationsListener } from './notifications.listener';
import { NotificationRecipientResolver } from './notification-recipient.resolver';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotificationsController, DevNotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepo,
    NotificationsGateway,
    NotificationsRealtimeService,
    NotificationsListener,
    NotificationRecipientResolver,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
