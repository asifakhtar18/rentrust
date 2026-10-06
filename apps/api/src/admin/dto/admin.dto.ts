import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType, UserRole } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserRolesDto {
  @ApiProperty({ enum: UserRole, isArray: true })
  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(Object.values(UserRole), { each: true })
  roles!: UserRole[];
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] })
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';
}

export class CreateLandlordDto {
  @ApiProperty({ example: 'Prestige Group' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  displayName!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(25)
  aliases?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompany?: boolean;
}

export class CreateManagerDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;
}

export class LinkLandlordDto {
  @ApiProperty()
  @IsUUID()
  landlordId!: string;

  @ApiPropertyOptional({ enum: ['OWNER', 'CO_OWNER'] })
  @IsOptional()
  @IsIn(['OWNER', 'CO_OWNER'])
  role?: 'OWNER' | 'CO_OWNER';
}

export class CsvImportDto {
  @ApiProperty({ description: 'Raw CSV content (header row required)' })
  @IsString()
  @MaxLength(1_000_000)
  csv!: string;

  @ApiProperty({ description: 'Locality all imported properties belong to' })
  @IsUUID()
  localityId!: string;

  @ApiPropertyOptional({ description: 'Validate only; do not persist', default: false })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class UpdateScoreWeightsDto {
  @ApiProperty({ description: 'Config name', example: 'default-v2' })
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  name!: string;

  @ApiProperty({
    description: 'Category key -> weight (0..1)',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  @IsObject()
  weights!: Record<string, number>;

  @ApiPropertyOptional({ description: 'Activate this config immediately', default: true })
  @IsOptional()
  @IsBoolean()
  activate?: boolean;
}

// Re-exported for the property-type reference endpoint.
export const PROPERTY_TYPES = Object.values(PropertyType);
