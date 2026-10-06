import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { OffsetPaginationQuery } from '../common/dto/pagination.dto';
import { ModerationService } from './moderation.service';
import {
  AppealDecisionDto,
  ModerateReviewDto,
  ReportReviewDto,
  SubmitAppealDto,
} from './dto/moderation.dto';

@ApiTags('moderation')
@Controller({ version: '1' })
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  /** Public: anyone can report a review. Auth is optional (anonymous allowed). */
  @OptionalAuth()
  @Post('reviews/:id/report')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Report a review for moderation' })
  async report(
    @Param('id') id: string,
    @Body() dto: ReportReviewDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    const report = await this.moderation.report(id, dto.reason, dto.details, user?.id);
    return { data: { id: report.id, status: report.status } };
  }

  /** Resident appeals a moderation decision on their own review. */
  @ApiBearerAuth()
  @Post('reviews/:id/appeal')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Appeal a moderation decision on your review' })
  async appeal(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SubmitAppealDto,
  ) {
    await this.moderation.submitAppeal(userId, id, dto.reason);
    return { data: { appealed: true } };
  }

  // ----- Moderator / admin -----

  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Get('moderation/queue')
  @ApiOperation({ summary: 'Moderator queue of reviews needing attention' })
  async queue(@Query() q: OffsetPaginationQuery) {
    const result = await this.moderation.queue({ page: q.page, pageSize: q.pageSize });
    return {
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize },
    };
  }

  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Get('moderation/reviews/:id')
  @ApiOperation({ summary: 'Full moderation view of a review (reports + history)' })
  async detail(@Param('id') id: string) {
    return { data: await this.moderation.getForModeration(id) };
  }

  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Post('moderation/reviews/:id/decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a moderation decision to a review' })
  async moderate(
    @CurrentUser('id') moderatorId: string,
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    const review = await this.moderation.moderate(moderatorId, id, dto.decision, dto.note);
    return { data: { id: review.id, status: review.status } };
  }

  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @Post('moderation/reviews/:id/appeal-decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant or deny an appeal' })
  async appealDecision(
    @CurrentUser('id') moderatorId: string,
    @Param('id') id: string,
    @Body() dto: AppealDecisionDto,
  ) {
    const review = await this.moderation.decideAppeal(moderatorId, id, dto.decision, dto.note);
    return { data: { id: review.id, status: review.status } };
  }
}
