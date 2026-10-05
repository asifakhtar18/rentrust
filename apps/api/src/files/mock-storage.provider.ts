import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PresignedUpload, StorageProvider } from './storage.interface';

/**
 * Development/test storage provider. Produces deterministic fake signed URLs
 * and keeps no bytes. It lets the entire verification flow (request URL ->
 * register document -> admin review) run end-to-end without MinIO/S3, while
 * preserving the real contract: callers persist the returned `key`, never a
 * public URL. Never selected in production (STORAGE_DRIVER=mock).
 */
@Injectable()
export class MockStorageProvider implements StorageProvider {
  private readonly logger = new Logger('MockStorageProvider');
  private readonly ttlSeconds = 900;

  async createPresignedUpload(input: {
    keyPrefix: string;
    contentType: string;
    maxSizeBytes: number;
  }): Promise<PresignedUpload> {
    const key = `${input.keyPrefix}/${randomUUID()}`;
    this.logger.debug(`Issued mock upload URL for key ${key}`);
    return {
      key,
      uploadUrl: `http://mock-storage.local/upload/${encodeURIComponent(key)}`,
      expiresAt: new Date(Date.now() + this.ttlSeconds * 1000),
      requiredHeaders: { 'Content-Type': input.contentType },
    };
  }

  async createPresignedDownload(key: string): Promise<{ downloadUrl: string; expiresAt: Date }> {
    return {
      downloadUrl: `http://mock-storage.local/download/${encodeURIComponent(key)}`,
      expiresAt: new Date(Date.now() + this.ttlSeconds * 1000),
    };
  }

  async delete(key: string): Promise<void> {
    this.logger.debug(`Mock delete of key ${key}`);
  }
}
