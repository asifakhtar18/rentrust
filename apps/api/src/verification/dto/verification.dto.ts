import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationEvidenceType } from '@prisma/client';
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
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from '../../files/storage.interface';

export class RequestUploadUrlDto {
  @ApiProperty({ enum: ALLOWED_DOCUMENT_MIME_TYPES })
  @IsIn(ALLOWED_DOCUMENT_MIME_TYPES as unknown as string[])
  contentType!: string;

  @ApiProperty({ maximum: MAX_DOCUMENT_SIZE_BYTES, description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  @Max(MAX_DOCUMENT_SIZE_BYTES)
  sizeBytes!: number;
}

export class DocumentRefDto {
  @ApiProperty({ description: 'Storage key returned by the upload-url request' })
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

export class CreateVerificationDto {
  @ApiProperty()
  @IsUUID()
  propertyId!: string;

  @ApiPropertyOptional({ description: 'The review this verification supports' })
  @IsOptional()
  @IsUUID()
  reviewId?: string;

  @ApiProperty({ enum: VerificationEvidenceType })
  @IsEnum(VerificationEvidenceType)
  evidenceType!: VerificationEvidenceType;

  @ApiProperty({ type: [DocumentRefDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DocumentRefDto)
  documents!: DocumentRefDto[];
}

export class DecideVerificationDto {
  @ApiProperty({ enum: ['VERIFIED', 'REJECTED'] })
  @IsIn(['VERIFIED', 'REJECTED'])
  decision!: 'VERIFIED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}
