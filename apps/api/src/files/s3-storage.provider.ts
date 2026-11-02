import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { AppConfig } from '../config/configuration';
import { BadRequestAppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { MAX_DOCUMENT_SIZE_BYTES, PresignedUpload, StorageProvider } from './storage.interface';

/**
 * Cloudflare R2 S3-compatible storage provider. Issues
 * presigned PUT/GET URLs so file bytes never pass through the API server, and
 * the bucket is private — objects are only reachable via short-lived signed
 * URLs we mint for authorised readers. Selected by STORAGE_DRIVER=s3.
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger('S3StorageProvider');
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly ttlSeconds: number;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const storage = this.config.get('storage', { infer: true });
    this.bucket = storage.bucket;
    this.ttlSeconds = storage.signedUrlTtlSeconds;
    this.client = new S3Client({
      region: storage.region,
      endpoint: storage.endpoint,
      forcePathStyle: storage.forcePathStyle,
      credentials:
        storage.accessKeyId && storage.secretAccessKey
          ? { accessKeyId: storage.accessKeyId, secretAccessKey: storage.secretAccessKey }
          : undefined,
    });
  }

  async createPresignedUpload(input: {
    keyPrefix: string;
    contentType: string;
    maxSizeBytes: number;
  }): Promise<PresignedUpload> {
    const key = `${input.keyPrefix}/${randomUUID()}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: input.contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: this.ttlSeconds });
    return {
      key,
      uploadUrl,
      expiresAt: new Date(Date.now() + this.ttlSeconds * 1000),
      requiredHeaders: { 'Content-Type': input.contentType },
    };
  }

  async assertUploadedDocument(key: string, contentType: string, sizeBytes: number): Promise<void> {
    let metadata;
    try {
      metadata = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'NotFound' ||
          error.name === 'NoSuchKey' ||
          error.name === '404' ||
          ('$metadata' in error &&
            (error.$metadata as { httpStatusCode?: number })?.httpStatusCode === 404))
      ) {
        throw new BadRequestAppException(
          'Uploaded document was not found. Please upload it again.',
        );
      }
      throw error;
    }
    if (
      !metadata.ContentLength ||
      metadata.ContentLength > MAX_DOCUMENT_SIZE_BYTES ||
      metadata.ContentLength !== sizeBytes
    ) {
      throw new BadRequestAppException(
        'Uploaded document size does not match.',
        ErrorCode.FILE_TOO_LARGE,
      );
    }
    if (metadata.ContentType !== contentType) {
      throw new BadRequestAppException(
        'Uploaded document type does not match.',
        ErrorCode.INVALID_FILE_TYPE,
      );
    }
  }

  async createPresignedDownload(key: string): Promise<{ downloadUrl: string; expiresAt: Date }> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const downloadUrl = await getSignedUrl(this.client, command, { expiresIn: this.ttlSeconds });
    return { downloadUrl, expiresAt: new Date(Date.now() + this.ttlSeconds * 1000) };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    this.logger.debug(`Deleted object ${key}`);
  }
}
