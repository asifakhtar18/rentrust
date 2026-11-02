import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

/**
 * Worker process entrypoint. Boots the same application context as the API but
 * as a standalone (non-HTTP) application, so BullMQ workers (trust-score
 * recalculation, etc.) run in a separate, independently-scalable process from
 * the API — the deployment model for the container host (ADR-005).
 *
 * The in-process worker in the API still runs in single-process/dev setups;
 * in production you run the API with WORKER_IN_PROCESS=false and this worker
 * separately. Both share identical wiring, so there is no logic duplication.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const logger = app.get(Logger);
  logger.log('RenTrust worker started; processing background jobs.');

  // Keep the process alive; BullMQ workers are started by their modules'
  // lifecycle hooks. Graceful shutdown is handled by Nest shutdown hooks.
  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`Received ${signal}, shutting down worker.`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void bootstrap();
