import { Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../../config/env';

export const QUEUE_CONNECTION = Symbol('QUEUE_CONNECTION');
export const QUEUE_DEFAULT = Symbol('QUEUE_DEFAULT');

@Module({
  providers: [
    {
      provide: QUEUE_CONNECTION,
      useFactory: () => {
        if (!env.QUEUE_ENABLED) {
          return null;
        }
        return new Redis({
          host: env.QUEUE_HOST || '127.0.0.1',
          port: env.QUEUE_PORT || 6379,
          password: env.QUEUE_PASSWORD,
        });
      },
    },
    {
      provide: QUEUE_DEFAULT,
      useFactory: (connection: Redis | null) => {
        if (!connection) {
          return null;
        }
        return new Queue('default', { connection });
      },
      inject: [QUEUE_CONNECTION],
    },
  ],
  exports: [QUEUE_CONNECTION, QUEUE_DEFAULT],
})
export class QueueModule {}
