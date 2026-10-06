import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { ValidationException } from './common/errors/app.exception';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, genReqId: () => undefined as unknown as string }),
    { bufferLogs: true },
  );

  // Use pino for all Nest logs so everything shares one structured stream.
  app.useLogger(app.get(PinoLogger));

  const config = app.get(ConfigService<AppConfig, true>);
  const appConfig = config.get('port', { infer: true });
  const apiPrefix = config.get('apiPrefix', { infer: true });
  const corsOrigins = config.get('corsOrigins', { infer: true });

  // Security headers. CSP is relaxed here because this process serves JSON only;
  // the Next.js frontend owns its own CSP.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie);
  // Multipart for server-side image uploads (compressed before storage).
  // Limit is generous; the image compressor downsizes afterwards.
  await app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024, files: 1 } });

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Health/readiness probes live at the root (/health, /ready) so container
  // orchestrators can probe them without the versioned API prefix.
  app.setGlobalPrefix(apiPrefix, { exclude: ['health', 'ready'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Validate and transform every DTO. Unknown properties are rejected to keep
  // the attack surface small; failures surface as a typed validation error.
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

  // OpenAPI docs generated from decorators/DTOs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('RentTrust API')
    .setDescription('Know the place before you rent it. Rental-property intelligence API.')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  app.enableShutdownHooks();

  await app.listen(appConfig, '0.0.0.0');
}

void bootstrap();
