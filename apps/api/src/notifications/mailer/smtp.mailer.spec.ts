import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { SmtpMailer } from './smtp.mailer';

/*
 * Unit tests for the real SMTP mailer. nodemailer is mocked so no network/SMTP
 * is touched — we assert that the transport is created from config and that
 * sendMail is called with the right envelope. This is the "mock it in unit
 * testing" seam: the production code path (createTransport -> sendMail) runs,
 * but the transport itself is a jest mock.
 */

const sendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
const createTransport = jest.fn().mockReturnValue({ sendMail });

jest.mock('nodemailer', () => ({
  createTransport: (opts: unknown) => createTransport(opts),
}));

/** Minimal ConfigService stub returning a fixed email config block. */
function configWith(email: Partial<AppConfig['email']>): ConfigService<AppConfig, true> {
  const value: AppConfig['email'] = {
    driver: 'smtp',
    from: 'RenTrust <no-reply@rentrust.local>',
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: 'user',
    smtpPassword: 'pass',
    ...email,
  };
  return {
    get: () => value,
  } as unknown as ConfigService<AppConfig, true>;
}

describe('SmtpMailer', () => {
  beforeEach(() => {
    sendMail.mockClear();
    createTransport.mockClear();
  });

  it('creates a transport from config and sends mail with the configured from address', async () => {
    const mailer = new SmtpMailer(configWith({}));

    await mailer.send({ to: 'a@b.com', subject: 'Hi', text: 'body', html: '<p>body</p>' });

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'user', pass: 'pass' },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'RenTrust <no-reply@rentrust.local>',
        to: 'a@b.com',
        subject: 'Hi',
        text: 'body',
        html: '<p>body</p>',
      }),
    );
  });

  it('reuses the transport across multiple sends', async () => {
    const mailer = new SmtpMailer(configWith({}));

    await mailer.send({ to: 'a@b.com', subject: 'One', text: '1' });
    await mailer.send({ to: 'c@d.com', subject: 'Two', text: '2' });

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('omits auth when credentials are not provided', async () => {
    const mailer = new SmtpMailer(configWith({ smtpUser: undefined, smtpPassword: undefined }));

    await mailer.send({ to: 'a@b.com', subject: 'Hi', text: 'body' });

    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ auth: undefined }));
  });

  it('throws a clear error when SMTP host is missing', async () => {
    const mailer = new SmtpMailer(configWith({ smtpHost: undefined }));

    await expect(mailer.send({ to: 'a@b.com', subject: 'Hi', text: 'body' })).rejects.toThrow(
      /SMTP_HOST is not configured/,
    );
    expect(sendMail).not.toHaveBeenCalled();
  });
});
