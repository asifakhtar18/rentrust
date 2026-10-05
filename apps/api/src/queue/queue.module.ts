import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { AppConfig } from '../config/configuration';
import { QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from './queue.constants';

export const TRUST_SCORE_QUEUE = Symbol('TRUST_SCORE_QUEUE');
export const QUEUE_CONNECTION = Symbol('QUEUE_CONNECTION');

/**
 * Provides BullMQ queues and a dedicated Redis connection for them. BullMQ
 * requires its own connection with maxRetriesPerRequest=null, kept separate
 * from the app's general-purpose RedisService. Workers are registered by the
 * modules that own the job logic (see TrustScoreModule) so this stays generic.
 */
@Global()
@Module({
  providers: [
    {
      provide: QUEUE_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const url = config.get('redis', { infer: true }).url;
        return new IORedis(url, { maxRetriesPerRequest: null });
      },
    },
    {
      provide: TRUST_SCORE_QUEUE,
      inject: [QUEUE_CONNECTION],
      useFactory: (connection: IORedis) =>
        new Queue(QUEUE_NAMES.TRUST_SCORE, {
          connection,
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        }),
    },
  ],
  exports: [TRUST_SCORE_QUEUE, QUEUE_CONNECTION],
})
export class QueueModule {}
