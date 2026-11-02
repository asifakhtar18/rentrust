import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { AppConfig } from '../../config/configuration';
import { Mailer, MailMessage } from './mailer.interface';

/**
 * Real SMTP mailer backed by nodemailer. Selected when EMAIL_DRIVER=smtp
 * (staging/production). The transport is created lazily on first send and
 * reused, so booting the app without SMTP configured never fails — it only
 * fails if an SMTP send is actually attempted without a host.
 *
 * Secure flag: port 465 uses implicit TLS (secure=true); 587/25 use STARTTLS
 * (secure=false). This is derived in config and can be overridden with
 * SMTP_SECURE.
 */
@Injectable()
export class SmtpMailer implements Mailer {
  private readonly logger = new Logger('SmtpMailer');
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const email = this.config.get('email', { infer: true });
    if (!email.smtpHost) {
      throw new Error(
        'EMAIL_DRIVER=smtp but SMTP_HOST is not configured. Set SMTP_HOST (and port/user/password) or use EMAIL_DRIVER=console.',
      );
    }

    this.transporter = createTransport({
      host: email.smtpHost,
      port: email.smtpPort ?? (email.smtpSecure ? 465 : 587),
      secure: email.smtpSecure,
      // Only attach auth when credentials are provided; some relays (e.g. a
      // local MTA) accept unauthenticated submission.
      auth:
        email.smtpUser && email.smtpPassword
          ? { user: email.smtpUser, pass: email.smtpPassword }
          : undefined,
    });

    return this.transporter;
  }

  async send(message: MailMessage): Promise<void> {
    const { from } = this.config.get('email', { infer: true });
    try {
      await this.getTransporter().sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } catch (err) {
      // Log and rethrow so callers / global handlers can react, but never log
      // the message body (it may contain tokens).
      this.logger.error(
        `Failed to send email to ${message.to} (subject: "${message.subject}")`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }
}
