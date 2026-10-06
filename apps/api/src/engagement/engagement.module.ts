import { Module } from '@nestjs/common';
import { PropertiesModule } from '../properties/properties.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { EngagementController } from './engagement.controller';
import { EngagementService } from './engagement.service';

@Module({
  imports: [PropertiesModule, TrustScoreModule],
  controllers: [EngagementController],
  providers: [EngagementService],
})
export class EngagementModule {}
