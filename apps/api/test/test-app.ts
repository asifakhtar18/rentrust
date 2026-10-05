import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { ValidationException } from '../src/common/errors/app.exception';

/**
 * Builds a fully-wired application for e2e tests using the same Fastify adapter
 * and versioning as production. The exception filter and response interceptor
 * are already registered globally inside AppModule (as APP_FILTER /
 * APP_INTERCEPTOR), so we must NOT re-register them here or responses get
 * double-wrapped. The global ValidationPipe, however, is applied in main.ts
 * (not via AppModule), so we reproduce it here.
 */
export async function createTestApp(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) =>
        new ValidationException('Request validation failed', {
          fields: errors.map((e) => ({
            field: e.property,
            constraints: e.constraints ? Object.values(e.constraints) : [],
          })),
        }),
    }),
  );

  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
