import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { LegacyUnitsBridgeModule } from './modules/legacy-units-bridge/legacy-units-bridge.module';
import { HealthModule } from './modules/health/health.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { env } from './config/env';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AppLoggerModule } from './infra/logger/logger.module';
import { StorageModule } from './infra/storage/storage.module';
import { QueueModule } from './infra/queue/queue.module';
import { MetricsModule } from './infra/metrics/metrics.module';

@Module({
  imports: [
    AppLoggerModule,
    PrismaModule,
    StorageModule,
    QueueModule,
    MetricsModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: (env.THROTTLE_TTL ?? 60) * 1000,
        limit: env.THROTTLE_LIMIT ?? 300,
      },
    ]),
    AuthModule,
    UsersModule,
    AccessControlModule,
    LegacyUnitsBridgeModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
