/**
 * Transport-agnostic mail contract. Auth and notifications depend on this
 * interface, not a concrete provider, so SMTP/SES/Resend can be swapped in
 * without touching callers.
 */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export const MAILER = Symbol('MAILER');
