import Redis from 'ioredis';
import { ThrottlerStorage } from '@nestjs/throttler';

/** Shared, atomic rate-limit counters for horizontally scaled/serverless API instances. */
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ) {
    const result = (await this.redis.eval(
      `local blockedTtl = redis.call('PTTL', KEYS[2])
       if blockedTtl > 0 then
         return {redis.call('GET', KEYS[1]) or '0', redis.call('PTTL', KEYS[1]), 1, blockedTtl}
       end
       local hits = redis.call('INCR', KEYS[1])
       local counterTtl = redis.call('PTTL', KEYS[1])
       if hits == 1 or counterTtl < 0 then
         redis.call('PEXPIRE', KEYS[1], ARGV[1])
         counterTtl = ARGV[1]
       end
       if hits > tonumber(ARGV[2]) then
         redis.call('PSETEX', KEYS[2], ARGV[3], '1')
         return {hits, counterTtl, 1, ARGV[3]}
       end
       return {hits, counterTtl, 0, 0}`,
      2,
      `throttle:${key}`,
      `throttle-block:${key}`,
      ttl,
      limit,
      blockDuration,
    )) as [number | string, number | string, number | string, number | string];

    return {
      totalHits: Number(result[0]),
      timeToExpire: Math.max(0, Number(result[1])),
      isBlocked: Number(result[2]) === 1,
      timeToBlockExpire: Math.max(0, Number(result[3])),
    };
  }
}
