import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLocalitySuggestionDto {
  @ApiProperty({ description: 'City the suggested neighbourhood belongs to' })
  @IsUUID()
  cityId!: string;

  @ApiProperty({ example: 'Indiranagar' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    description: 'Landmarks or alternate spellings that help reviewers identify the area',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

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

  @ApiPropertyOptional({ description: 'Google Maps link used as a reference by moderators' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  googleMapsUrl?: string;
}

export class ReviewLocalitySuggestionDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
