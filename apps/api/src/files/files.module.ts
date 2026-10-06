import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { MockStorageProvider } from './mock-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { ImageCompressor } from './image-compressor';
import { STORAGE_PROVIDER } from './storage.interface';

/**
 * Provides a single StorageProvider selected by STORAGE_DRIVER. Global so
 * verification and claims modules can inject STORAGE_PROVIDER directly. Default
 * is the mock driver (no S3/MinIO needed for local dev and tests).
 */
@Global()
@Module({
  providers: [
    MockStorageProvider,
    S3StorageProvider,
    ImageCompressor,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService, MockStorageProvider, S3StorageProvider],
      useFactory: (
        config: ConfigService<AppConfig, true>,
        mock: MockStorageProvider,
        s3: S3StorageProvider,
      ) => {
        const driver = config.get('storage', { infer: true }).driver;
        return driver === 's3' ? s3 : mock;
      },
    },
  ],
  exports: [STORAGE_PROVIDER, ImageCompressor],
})
export class FilesModule {}
