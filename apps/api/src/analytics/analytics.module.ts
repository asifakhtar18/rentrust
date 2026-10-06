import { Global, Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { DbAnalyticsProvider } from './db-analytics.provider';
import { ANALYTICS_PROVIDER } from './analytics.interface';

/**
 * Global analytics module. The provider is bound to the DB implementation;
 * swapping to a hosted analytics backend later is a one-line change here.
 */
@Global()
@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    DbAnalyticsProvider,
    { provide: ANALYTICS_PROVIDER, useExisting: DbAnalyticsProvider },
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
