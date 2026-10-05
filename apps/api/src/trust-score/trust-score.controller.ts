import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { TrustScoreService } from './trust-score.service';

@ApiTags('trust-score')
@Controller({ version: '1' })
export class TrustScoreController {
  constructor(private readonly trustScore: TrustScoreService) {}

  @Public()
  @Get('properties/:propertyId/score')
  @ApiOperation({ summary: 'Get the transparent trust score for a property' })
  async getScore(@Param('propertyId') propertyId: string) {
    return { data: await this.trustScore.getScore(propertyId) };
  }

  @Roles(UserRole.ADMIN)
  @Post('properties/:propertyId/score/recalculate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request an async trust-score recalculation (admin)' })
  async recalc(@Param('propertyId') propertyId: string) {
    await this.trustScore.requestRecalculation(propertyId);
    return { data: { queued: true } };
  }
}
