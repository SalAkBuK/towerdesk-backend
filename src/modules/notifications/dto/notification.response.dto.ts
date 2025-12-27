import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationTypeEnum } from '../notifications.constants';

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NotificationTypeEnum })
  type!: NotificationTypeEnum;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  body?: string | null;

  @ApiProperty()
  data!: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  readAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export const toNotificationResponse = (notification: {
  id: string;
  type: NotificationTypeEnum;
  title: string;
  body?: string | null;
  data: Record<string, unknown>;
  readAt?: Date | null;
  createdAt: Date;
}): NotificationResponseDto => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  body: notification.body ?? null,
  data: notification.data,
  readAt: notification.readAt ?? null,
  createdAt: notification.createdAt,
});
