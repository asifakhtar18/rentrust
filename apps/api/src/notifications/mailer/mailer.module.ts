import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { ConsoleMailer } from './console.mailer';
import { MAILER } from './mailer.interface';
import { SmtpMailer } from './smtp.mailer';

/**
 * Provides a single Mailer implementation selected by EMAIL_DRIVER. Global so
 * any module can inject MAILER without re-importing. Default is the console
 * driver, which keeps local development dependency-free.
 */
@Global()
@Module({
  providers: [
    ConsoleMailer,
    SmtpMailer,
    {
      provide: MAILER,
      inject: [ConfigService, ConsoleMailer, SmtpMailer],
      useFactory: (
        config: ConfigService<AppConfig, true>,
        consoleMailer: ConsoleMailer,
        smtpMailer: SmtpMailer,
      ) => {
        const driver = config.get('email', { infer: true }).driver;
        return driver === 'smtp' ? smtpMailer : consoleMailer;
      },
    },
  ],
  exports: [MAILER],
})
export class MailerModule {}
