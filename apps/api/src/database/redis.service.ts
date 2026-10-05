import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '../config/configuration';

/**
 * Shared Redis connection used by caching, rate limiting, and (via a separate
 * connection) BullMQ. Exposed as `client` so consumers use ioredis directly.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const url = this.config.get('redis', { infer: true }).url;
    this.client = new Redis(url, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
    this.client.on('error', (err) => this.logger.error({ err }, 'Redis error'));
    this.client.on('connect', () => this.logger.log('Redis connected'));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
