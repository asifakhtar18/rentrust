import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClaimRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from '../../files/storage.interface';

export class ClaimDocumentRefDto {
  @ApiProperty()
  @IsString()
  @MaxLength(512)
  storageKey!: string;

  @ApiProperty({ enum: ALLOWED_DOCUMENT_MIME_TYPES })
  @IsIn(ALLOWED_DOCUMENT_MIME_TYPES as unknown as string[])
  contentType!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(MAX_DOCUMENT_SIZE_BYTES)
  sizeBytes!: number;
}

export class CreateClaimDto {
  @ApiProperty({ enum: ClaimRole })
  @IsEnum(ClaimRole)
  role!: ClaimRole;

  @ApiProperty({ type: [ClaimDocumentRefDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ClaimDocumentRefDto)
  documents!: ClaimDocumentRefDto[];
}

export class DecideClaimDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}

export class OwnerResponseDto {
  @ApiProperty({ maxLength: 3000 })
  @IsString()
  @MaxLength(3000)
  body!: string;
}
