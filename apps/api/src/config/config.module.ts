import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configuration from './configuration';

/**
 * Global configuration module. Loads environment once and makes a typed
 * ConfigService available everywhere without re-importing.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // npm workspace scripts run from apps/api. Load local env files from the
      // API first, then the monorepo root; production providers inject process
      // env directly and do not need either file.
      envFilePath: ['.env.local', '../../.env.local', '.env', '../../.env'],
      load: [configuration],
    }),
  ],
})
export class ConfigModule {}
