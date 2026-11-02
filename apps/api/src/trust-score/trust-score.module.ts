import { Module, OnModuleInit } from '@nestjs/common';
import { EventBus } from '../events/event-bus';
import { DomainEvent } from '../events/events';
import { TrustScoreController } from './trust-score.controller';
import { TrustScoreEngine } from './trust-score.engine';
import { TrustScoreService } from './trust-score.service';
import { TrustScoreWorker } from './trust-score.worker';
import { ReferenceDataService } from './reference-data.service';

/**
 * Trust-score module. Subscribes to review lifecycle events and enqueues
 * recalculation, keeping scoring fully decoupled from review submission. The
 * worker consumes those jobs asynchronously.
 */
@Module({
  controllers: [TrustScoreController],
  providers: [TrustScoreEngine, TrustScoreService, TrustScoreWorker, ReferenceDataService],
  exports: [TrustScoreService, TrustScoreEngine, ReferenceDataService],
})
export class TrustScoreModule implements OnModuleInit {
  constructor(
    private readonly events: EventBus,
    private readonly trustScore: TrustScoreService,
  ) {}

  onModuleInit(): void {
    // Any review state change that affects the published set triggers a
    // recalculation. Enqueue (non-blocking); the worker does the work.
    const recalc = (payload: { propertyId: string }) =>
      this.trustScore.requestRecalculation(payload.propertyId);

    this.events.on(DomainEvent.REVIEW_PUBLISHED, recalc);
    this.events.on(DomainEvent.REVIEW_HIDDEN, recalc);
    this.events.on(DomainEvent.REVIEW_REMOVED, recalc);
    this.events.on(DomainEvent.REVIEW_VERIFIED, recalc);
  }
}
