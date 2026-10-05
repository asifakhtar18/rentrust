import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../database/redis.service';

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  dependencies: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

/**
 * Aggregates dependency checks for the readiness probe. Each check is isolated
 * so one failing dependency is reported without masking the others.
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async checkDependencies(): Promise<ReadinessReport> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);

    const report: ReadinessReport = {
      status: database === 'up' && redis === 'up' ? 'ok' : 'degraded',
      dependencies: { database, redis },
    };

    if (report.status === 'degraded') {
      throw new ServiceUnavailableException(report);
    }
    return report;
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    try {
      const pong = await this.redis.client.ping();
      return pong === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
