import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AnalyticsEventInput, AnalyticsProvider } from './analytics.interface';

/**
 * Default analytics provider: persists events to the AnalyticsEvent table.
 * Tracking must never break the request that triggered it, so write failures
 * are logged and swallowed. Props are stored as JSON and are expected to be
 * free of PII by convention (enforced by callers).
 */
@Injectable()
export class DbAnalyticsProvider implements AnalyticsProvider {
  private readonly logger = new Logger(DbAnalyticsProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async track(event: AnalyticsEventInput): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          name: event.name,
          userId: event.userId ?? null,
          anonId: event.anonId ?? null,
          props: event.props ? (event.props as object) : undefined,
        },
      });
    } catch (err) {
      this.logger.error({ err, name: event.name }, 'Failed to record analytics event');
    }
  }
}
