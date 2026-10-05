import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

/**
 * Global database module. Prisma and Redis are foundational infrastructure used
 * across every domain module, so they are provided once and exported globally
 * to avoid repetitive imports and multiple connection pools.
 */
@Global()
@Module({
  providers: [PrismaService, RedisService],
  exports: [PrismaService, RedisService],
})
export class DatabaseModule {}
