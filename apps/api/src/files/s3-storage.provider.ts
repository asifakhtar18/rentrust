import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { AppConfig } from '../config/configuration';
import { PresignedUpload, StorageProvider } from './storage.interface';

/**
 * S3-compatible storage provider (AWS S3, MinIO, Cloudflare R2). Issues
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

  async putObject(input: {
    keyPrefix: string;
    body: Buffer;
    contentType: string;
  }): Promise<{ key: string }> {
    const key = `${input.keyPrefix}/${randomUUID()}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    return { key };
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
