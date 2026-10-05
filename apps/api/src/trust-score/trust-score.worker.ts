import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { AppConfig } from '../config/configuration';
import { JOB, QUEUE_NAMES, RecalculateScoreJob } from '../queue/queue.constants';
import { QUEUE_CONNECTION } from '../queue/queue.module';
import { EventBus } from '../events/event-bus';
import { DomainEvent } from '../events/events';
import { TrustScoreEngine } from './trust-score.engine';

/**
 * BullMQ worker that processes trust-score recalculation jobs. Runs in-process
 * for the MVP but is isolated here so Phase 14 can launch it as a separate
 * worker process without touching the engine. Jobs are idempotent and retried
 * with backoff by BullMQ. Disabled under NODE_ENV=test, where tests invoke the
 * engine directly for determinism.
 */
@Injectable()
export class TrustScoreWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrustScoreWorker.name);
  private worker?: Worker<RecalculateScoreJob>;

  constructor(
    private readonly engine: TrustScoreEngine,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly events: EventBus,
    @Inject(QUEUE_CONNECTION) private readonly connection: IORedis,
  ) {}

  onModuleInit(): void {
    if (this.config.get('env', { infer: true }) === 'test') {
      return;
    }
    this.worker = new Worker<RecalculateScoreJob>(
      QUEUE_NAMES.TRUST_SCORE,
      async (job: Job<RecalculateScoreJob>) => {
        if (job.name !== JOB.RECALCULATE_PROPERTY_SCORE) return;
        const result = await this.engine.recalculate(job.data.propertyId);
        if (result) {
          await this.events.emit(DomainEvent.TRUST_SCORE_UPDATED, {
            propertyId: job.data.propertyId,
            overall: result.overall,
          });
        }
      },
      { connection: this.connection, concurrency: 4 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error({ err, jobId: job?.id }, 'Trust-score job failed');
    });
    this.logger.log('Trust-score worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
