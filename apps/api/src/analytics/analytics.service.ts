import { Inject, Injectable } from '@nestjs/common';
import { ANALYTICS_PROVIDER, AnalyticsEventInput, AnalyticsProvider } from './analytics.interface';

/**
 * Thin facade over the configured analytics provider. Fire-and-forget by
 * design: callers `void track(...)` so analytics never adds latency or failure
 * to the user-facing path.
 */
@Injectable()
export class AnalyticsService {
  constructor(@Inject(ANALYTICS_PROVIDER) private readonly provider: AnalyticsProvider) {}

  track(event: AnalyticsEventInput): Promise<void> {
    return this.provider.track(event);
  }
}
