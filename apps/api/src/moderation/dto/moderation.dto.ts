import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportReviewDto {
  @ApiProperty({ enum: ReportReason })
  @IsEnum(ReportReason)
  reason!: ReportReason;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

/** Moderator decision actions that change a review's published state. */
export const MODERATION_DECISIONS = [
  'PUBLISH',
  'REJECT',
  'HIDE',
  'UNHIDE',
  'REMOVE',
  'RESTORE',
] as const;
export type ModerationDecision = (typeof MODERATION_DECISIONS)[number];

export class ModerateReviewDto {
  @ApiProperty({ enum: MODERATION_DECISIONS })
  @IsIn(MODERATION_DECISIONS)
  decision!: ModerationDecision;

  @ApiPropertyOptional({ description: 'Internal moderator note (never public)', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class AppealDecisionDto {
  @ApiProperty({ enum: ['GRANT', 'DENY'] })
  @IsIn(['GRANT', 'DENY'])
  decision!: 'GRANT' | 'DENY';

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class SubmitAppealDto {
  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  reason!: string;
}
