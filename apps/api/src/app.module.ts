import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AppConfig } from './config/configuration';

/**
 * Root module. Wires global cross-cutting concerns:
 *  - structured logging with request ids (pino)
 *  - rate limiting (throttler)
 *  - the standard response envelope + error filter
 * Domain modules are added here as each phase lands.
 */
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const env = config.get('env', { infer: true });
        return {
          pinoHttp: {
            level: env === 'production' ? 'info' : 'debug',
            // Correlate every log line with a request id.
            genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
            customProps: (req) => ({ requestId: (req as { id?: string }).id }),
            // Never log sensitive headers or bodies.
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'res.headers["set-cookie"]',
                'req.body.password',
                'req.body.token',
              ],
              remove: true,
            },
            transport:
              env === 'development'
                ? { target: 'pino-pretty', options: { singleLine: true } }
                : undefined,
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const throttle = config.get('throttle', { infer: true });
        return [{ ttl: throttle.ttlSeconds * 1000, limit: throttle.limit }];
      },
    }),
    DatabaseModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
