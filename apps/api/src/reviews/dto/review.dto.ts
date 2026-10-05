import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DepositOutcome,
  MaintenanceResolutionBucket,
  TenureBucket,
  TriState,
  YesNoNa,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DISLIKED_TAGS, LIKED_TAGS } from '../review.constants';

/**
 * The structured 17-question review. Every question maps to a typed field so
 * reviews are aggregatable and moderatable — never a free-text blob. Rating
 * fields are 1-5; the DB also enforces these bounds via CHECK constraints.
 */
export class SubmitReviewDto {
  @ApiProperty()
  @IsUUID()
  propertyId!: string;

  // Q1
  @ApiProperty({ enum: TenureBucket, description: 'How long did you live here?' })
  @IsEnum(TenureBucket)
  tenure!: TenureBucket;

  // Q2
  @ApiProperty({ minimum: 1, maximum: 5, description: 'Management responsiveness' })
  @IsInt()
  @Min(1)
  @Max(5)
  managementResponsiveness!: number;

  // Q3
  @ApiProperty({ minimum: 1, maximum: 5, description: 'Maintenance quality' })
  @IsInt()
  @Min(1)
  @Max(5)
  maintenanceQuality!: number;

  // Q4
  @ApiProperty({ enum: MaintenanceResolutionBucket })
  @IsEnum(MaintenanceResolutionBucket)
  maintenanceResolution!: MaintenanceResolutionBucket;

  // Q5
  @ApiProperty({ enum: DepositOutcome })
  @IsEnum(DepositOutcome)
  depositOutcome!: DepositOutcome;

  // Q6
  @ApiProperty({ enum: YesNoNa })
  @IsEnum(YesNoNa)
  deductionsExplained!: YesNoNa;

  // Q7
  @ApiProperty({ minimum: 1, maximum: 5, description: 'Communication' })
  @IsInt()
  @Min(1)
  @Max(5)
  communication!: number;

  // Q8
  @ApiProperty({ minimum: 1, maximum: 5, description: 'How safe did you feel?' })
  @IsInt()
  @Min(1)
  @Max(5)
  safety!: number;

  // Q9
  @ApiProperty({ minimum: 1, maximum: 5, description: 'Water supply reliability' })
  @IsInt()
  @Min(1)
  @Max(5)
  waterSupply!: number;

  // Q10 — nullable means "not applicable"
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 5,
    description: 'Internet availability (omit if N/A)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  internet?: number;

  // Q11 — 1 = very noisy, 5 = very quiet
  @ApiProperty({ minimum: 1, maximum: 5, description: 'Noise (1 noisy .. 5 quiet)' })
  @IsInt()
  @Min(1)
  @Max(5)
  noise!: number;

  // Q12
  @ApiProperty({ minimum: 1, maximum: 5, description: 'Rules strictness (1 lax .. 5 strict)' })
  @IsInt()
  @Min(1)
  @Max(5)
  rulesStrictness!: number;

  // Q13
  @ApiProperty({ enum: TriState, description: 'Would you rent here again?' })
  @IsEnum(TriState)
  wouldRentAgain!: TriState;

  // Q14
  @ApiProperty({ description: 'Would you recommend this property?' })
  @IsBoolean()
  wouldRecommend!: boolean;

  // Q15
  @ApiPropertyOptional({ type: [String], enum: LIKED_TAGS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(LIKED_TAGS.length)
  @IsIn(LIKED_TAGS as unknown as string[], { each: true })
  likedTags?: string[];

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  likedText?: string;

  // Q16
  @ApiPropertyOptional({ type: [String], enum: DISLIKED_TAGS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(DISLIKED_TAGS.length)
  @IsIn(DISLIKED_TAGS as unknown as string[], { each: true })
  dislikedTags?: string[];

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  dislikedText?: string;

  // Q17
  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comments?: string;

  @ApiPropertyOptional({ description: 'Submit as draft instead of for moderation', default: false })
  @IsOptional()
  @IsBoolean()
  asDraft?: boolean;
}

export class ListReviewsQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @ApiPropertyOptional({ description: 'Only verified reviews', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  verifiedOnly?: boolean;
}
