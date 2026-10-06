import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

class TrackEventDto {
  @IsString()
  @MaxLength(64)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  anonId?: string;

  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;
}

@ApiTags('analytics')
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /**
   * Client-emitted product event. Auth is optional so anonymous funnel events
   * (search, property view) are captured; an authenticated caller is attributed
   * by userId. Returns 202 immediately — tracking is fire-and-forget.
   */
  @OptionalAuth()
  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Record a product analytics event' })
  async track(@Body() dto: TrackEventDto, @CurrentUser() user: AuthUser | undefined) {
    await this.analytics.track({
      name: dto.name,
      userId: user?.id ?? null,
      anonId: dto.anonId ?? null,
      props: dto.props,
    });
    return { data: { accepted: true } };
  }
}
