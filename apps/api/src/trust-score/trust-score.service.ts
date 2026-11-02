import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { AppConfig } from '../config/configuration';
import { NotFoundAppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { JOB, RecalculateScoreJob } from '../queue/queue.constants';
import { TRUST_SCORE_QUEUE } from '../queue/queue.module';
import { TrustScoreEngine } from './trust-score.engine';
import { EventBus } from '../events/event-bus';
import { DomainEvent } from '../events/events';

/**
 * Application-facing trust-score service. Uses BullMQ on long-running Node
 * hosts and inline recalculation in request-scoped/serverless environments.
 * It also serves the transparent score read model.
 */
@Injectable()
export class TrustScoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: TrustScoreEngine,
    private readonly config: ConfigService<AppConfig, true>,
    @Inject(TRUST_SCORE_QUEUE) private readonly queue: Queue<RecalculateScoreJob> | null,
    private readonly events: EventBus,
  ) {}

  /**
   * Recalculate inline when running in Vercel or tests because a serverless
   * function cannot host a persistent BullMQ worker. Long-running Node hosts
   * enqueue a deduplicated job instead.
   */
  async requestRecalculation(propertyId: string): Promise<void> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      select: { id: true },
    });
    if (!property) {
      throw new NotFoundAppException('Property not found', ErrorCode.PROPERTY_NOT_FOUND);
    }
    if (this.config.get('queue', { infer: true }).driver === 'inline') {
      const result = await this.engine.recalculate(propertyId);
      if (result) {
        await this.events.emit(DomainEvent.TRUST_SCORE_UPDATED, {
          propertyId,
          overall: result.overall,
        });
      }
      return;
    }
    if (!this.queue) throw new Error('Trust-score queue is unavailable.');
    await this.queue.add(
      JOB.RECALCULATE_PROPERTY_SCORE,
      { propertyId },
      { jobId: `score:${propertyId}` },
    );
  }

  /** Synchronous recalculation (used by the worker and by tests/admin). */
  recalculateNow(propertyId: string) {
    return this.engine.recalculate(propertyId);
  }

  /**
   * Transparent score read model for a property. Returns null-ish guidance when
   * there isn't enough verified data rather than a misleading number.
   */
  async getScore(propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
    });
    if (!property) {
      throw new NotFoundAppException('Property not found', ErrorCode.PROPERTY_NOT_FOUND);
    }

    const score = await this.prisma.propertyScore.findUnique({ where: { propertyId } });
    if (!score) {
      return {
        propertyId,
        hasEnoughData: false,
        message: 'Not enough verified resident data yet.',
        overall: null,
        sampleSize: 0,
        confidence: 0,
        categoryScores: {},
        positiveThemes: [],
        negativeThemes: [],
        lastCalculatedAt: null,
      };
    }

    return {
      propertyId,
      hasEnoughData: true,
      overall: score.overall,
      sampleSize: score.sampleSize,
      confidence: score.confidence,
      // The low-confidence flag drives UI copy ("based on few reviews").
      lowConfidence: score.confidence < 0.5,
      categoryScores: score.categoryScores,
      positiveThemes: score.positiveThemes,
      negativeThemes: score.negativeThemes,
      lastCalculatedAt: score.lastCalculatedAt,
    };
  }
}
