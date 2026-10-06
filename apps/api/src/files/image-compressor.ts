import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { AppConfig } from '../config/configuration';

export interface CompressedImage {
  body: Buffer;
  contentType: string;
  originalBytes: number;
  compressedBytes: number;
}

/**
 * Compresses images before they are stored. Images are re-encoded to WebP,
 * downscaled to a configurable max dimension (never upscaled), and stripped of
 * metadata (EXIF can leak GPS/location — a privacy win for verification docs).
 *
 * Why server-side: documents use presigned direct-to-storage uploads, but
 * images are proxied through the API specifically so we can guarantee
 * compression and metadata stripping before anything lands in R2.
 */
@Injectable()
export class ImageCompressor {
  private readonly logger = new Logger(ImageCompressor.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  async compress(input: Buffer, _mimeType: string): Promise<CompressedImage> {
    const cfg = this.config.get('imageCompression', { infer: true });
    if (!cfg.enabled) {
      return {
        body: input,
        contentType: _mimeType,
        originalBytes: input.length,
        compressedBytes: input.length,
      };
    }

    // rotate() applies EXIF orientation before we drop metadata, so the stored
    // image looks correct without carrying the original EXIF payload.
    const body = await sharp(input)
      .rotate()
      .resize({
        width: cfg.maxWidth,
        height: cfg.maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: cfg.quality })
      .toBuffer();

    this.logger.debug(
      `Compressed image ${input.length} -> ${body.length} bytes (${Math.round(
        (body.length / input.length) * 100,
      )}%)`,
    );

    return {
      body,
      contentType: 'image/webp',
      originalBytes: input.length,
      compressedBytes: body.length,
    };
  }
}
