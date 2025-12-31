import { config } from 'dotenv';
import { resolve } from 'path';
import { envSchema } from './env.schema';

config({ path: resolve(process.cwd(), '.env') });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = {
  ...parsed.data,
  QUEUE_ENABLED: parsed.data.QUEUE_ENABLED === 'true',
  REQUEST_METRICS_ENABLED:
    parsed.data.REQUEST_METRICS_ENABLED !== undefined
      ? parsed.data.REQUEST_METRICS_ENABLED === 'true'
      : parsed.data.NODE_ENV === 'production',
  PRISMA_APPLY_SESSION_TIMEOUTS:
    parsed.data.PRISMA_APPLY_SESSION_TIMEOUTS === 'true',
  WS_LOG_CONNECTIONS:
    parsed.data.WS_LOG_CONNECTIONS !== undefined
      ? parsed.data.WS_LOG_CONNECTIONS === 'true'
      : true,
};

export type Env = typeof env;
