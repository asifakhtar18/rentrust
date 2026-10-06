import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SearchEntityType } from '../search.interface';

const ENTITY_TYPES: SearchEntityType[] = ['property', 'landlord', 'locality'];

export class SearchQueryDto {
  @ApiProperty({ description: 'Search text', example: 'Prestige Lakeside' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  q!: string;

  @ApiPropertyOptional({ enum: ENTITY_TYPES, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @IsIn(ENTITY_TYPES, { each: true })
  types?: SearchEntityType[];

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @ApiPropertyOptional({ description: 'Bias/filter results near this latitude' })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Bias/filter results near this longitude' })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Restrict geo results to this radius (metres)',
    maximum: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(50000)
  radiusMeters?: number;
}
