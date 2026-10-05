import { Injectable, Logger } from '@nestjs/common';
import { Mailer, MailMessage } from './mailer.interface';

/**
 * Development mailer: logs the message instead of sending it. Lets the full
 * verification/reset flow run end-to-end locally with no SMTP credentials.
 * Never used in production (selected by EMAIL_DRIVER=console).
 */
@Injectable()
export class ConsoleMailer implements Mailer {
  private readonly logger = new Logger('ConsoleMailer');

  async send(message: MailMessage): Promise<void> {
    this.logger.log(
      `\n--- EMAIL (dev) ---\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n-------------------`,
    );
  }
}
