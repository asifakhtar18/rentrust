import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyStatus, PropertyType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsIn,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AddressInput {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  line1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  line2?: string;

  @ApiProperty()
  @IsUUID()
  cityId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  localityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  postalCode?: string;
}

export class CreatePropertyDto {
  @ApiProperty({ example: 'Prestige Lakeside Habitat' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  displayName!: string;

  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @ApiPropertyOptional({ type: [String], description: 'Alternate names/spellings' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(25)
  aliases?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressInput)
  address?: AddressInput;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  developer?: string;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  googleMapsUrl?: string;
}

export class UpdatePropertyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  displayName?: string;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  localityId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine1?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine2?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  postalCode?: string | null;

  @ApiPropertyOptional({ maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  googleMapsUrl?: string | null;

  @ApiPropertyOptional({
    enum: [PropertyStatus.ACTIVE, PropertyStatus.HIDDEN, PropertyStatus.ARCHIVED],
  })
  @IsOptional()
  @IsIn([PropertyStatus.ACTIVE, PropertyStatus.HIDDEN, PropertyStatus.ARCHIVED])
  status?: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(25)
  aliases?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  developer?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  @Transform(({ value }) => (value === null || value === '' ? value : Number(value)))
  yearBuilt?: number | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  amenities?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  @Transform(({ value }) => (value === null || value === '' ? value : Number(value)))
  latitude?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  @Transform(({ value }) => (value === null || value === '' ? value : Number(value)))
  longitude?: number | null;
}

export class AdminListPropertiesQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @ApiPropertyOptional({ description: 'Search property names and aliases' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;
}

export class PropertySimilarityQuery {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

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
}

export class PropertyMapBoundsQuery {
  @ApiProperty()
  @IsLongitude()
  @Type(() => Number)
  west!: number;

  @ApiProperty()
  @IsLatitude()
  @Type(() => Number)
  south!: number;

  @ApiProperty()
  @IsLongitude()
  @Type(() => Number)
  east!: number;

  @ApiProperty()
  @IsLatitude()
  @Type(() => Number)
  north!: number;
}

export class ListPropertiesQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  localityId?: string;
}

export class NearbyPropertiesQuery {
  @ApiProperty()
  @IsLatitude()
  @Type(() => Number)
  latitude!: number;

  @ApiProperty()
  @IsLongitude()
  @Type(() => Number)
  longitude!: number;

  @ApiPropertyOptional({ default: 5000, description: 'Radius in metres', maximum: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(50000)
  radiusMeters = 5000;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
