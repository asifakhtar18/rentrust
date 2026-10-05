import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { Mailer, MailMessage } from './mailer.interface';

/**
 * SMTP mailer adapter. Kept as a thin seam so wiring a concrete transport
 * (nodemailer / SES / Resend) later is a localized change. It does not pull in
 * an SMTP client dependency yet; if EMAIL_DRIVER=smtp is selected without the
 * transport being completed, we fail fast with a clear message rather than
 * silently dropping mail.
 */
@Injectable()
export class SmtpMailer implements Mailer {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  async send(_message: MailMessage): Promise<void> {
    const email = this.config.get('email', { infer: true });
    if (!email.smtpHost) {
      throw new Error(
        'EMAIL_DRIVER=smtp but SMTP_HOST is not configured. Configure SMTP settings or use EMAIL_DRIVER=console.',
      );
    }
    // Intentionally not implemented: no SMTP library is bundled in the MVP.
    // Replace this body with a real transport send when SMTP is provisioned.
    throw new Error(
      'SMTP transport is not implemented in the MVP. Provide a nodemailer/SES/Resend adapter here.',
    );
  }
}
