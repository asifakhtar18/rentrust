import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const PROPERTY_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_PROPERTY_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_PROPERTY_IMAGES = 12;

export class PropertyImageUploadDto {
  @ApiProperty({ enum: PROPERTY_IMAGE_MIME_TYPES })
  @IsIn(PROPERTY_IMAGE_MIME_TYPES as unknown as string[])
  contentType!: string;

  @ApiProperty({ maximum: MAX_PROPERTY_IMAGE_SIZE_BYTES, description: 'Image size in bytes' })
  @IsInt()
  @Min(1)
  @Max(MAX_PROPERTY_IMAGE_SIZE_BYTES)
  sizeBytes!: number;
}

export class CreatePropertyImageDto extends PropertyImageUploadDto {
  @ApiProperty({ description: 'Storage key returned by the upload-url endpoint' })
  @IsString()
  @MaxLength(512)
  storageKey!: string;

  @ApiPropertyOptional({ maxLength: 200, description: 'Accessible description of the image' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  altText?: string;
}
