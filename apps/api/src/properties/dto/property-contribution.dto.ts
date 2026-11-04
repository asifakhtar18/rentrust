import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyContributionKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsString,
  IsEnum,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsInt,
  IsArray,
  IsOptional,
  IsUrl,
  IsUUID,
  MaxLength,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PropertyType } from '@prisma/client';

export class CreatePropertyContributionDto {
  @ApiProperty({ enum: PropertyContributionKind })
  @IsEnum(PropertyContributionKind)
  kind!: PropertyContributionKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  displayName?: string;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(25)
  aliases?: string[];

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  developer?: string;

  @ApiPropertyOptional({ minimum: 1800, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  @Type(() => Number)
  yearBuilt?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  amenities?: string[];

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  localityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  googleMapsUrl?: string;

  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine1?: string;

  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine2?: string;

  @ApiPropertyOptional({ maxLength: 16 })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  postalCode?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @ApiPropertyOptional({
    maxLength: 2048,
    description: 'Optional reference link for a photo request.',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2048)
  imageUrl?: string;
}

export class ReviewPropertyContributionDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
