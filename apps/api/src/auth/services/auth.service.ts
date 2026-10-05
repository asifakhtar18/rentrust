import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import { AppConfig } from '../../config/configuration';
import {
  ConflictAppException,
  ForbiddenAppException,
  UnauthorizedAppException,
} from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { MAILER, Mailer } from '../../notifications/mailer/mailer.interface';
import { PasswordService } from './password.service';
import { TokenService, parseDurationMs } from './token.service';
import { AuthTokensDto } from '../dto/auth.dto';

const EMAIL_VERIFY = 'EMAIL_VERIFY';
const PASSWORD_RESET = 'PASSWORD_RESET';

interface SessionContext {
  userAgent?: string;
  ip?: string;
}

/**
 * Core authentication logic: registration, login, refresh-token rotation,
 * logout, email verification, and password reset.
 *
 * Security posture:
 *  - Passwords hashed with argon2id; never stored or logged in plaintext.
 *  - Refresh tokens are opaque and stored only as hashes; rotation detects
 *    reuse (a replayed old token) and revokes the whole session chain.
 *  - Enumeration-safe: login and password-reset responses don't reveal whether
 *    an email exists.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService<AppConfig, true>,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  async register(
    email: string,
    password: string,
    displayName: string | undefined,
    ctx: SessionContext,
  ): Promise<AuthTokensDto> {
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictAppException(
        'An account with this email already exists.',
        ErrorCode.EMAIL_ALREADY_REGISTERED,
      );
    }

    const passwordHash = await this.passwords.hash(password);
    const user = await this.users.createWithProfile({ email, passwordHash, displayName });

    await this.sendEmailVerification(user);
    return this.issueTokens(user, ctx);
  }

  async login(email: string, password: string, ctx: SessionContext): Promise<AuthTokensDto> {
    const user = await this.users.findByEmail(email);
    // Constant-ish work regardless of existence to reduce enumeration signal.
    const hash =
      user?.passwordHash ??
      '$argon2id$v=19$m=19456,t=2,p=1$invalidinvalidinvalid$invalidinvalidinvalidinvalidinvalidinvalid';
    const ok = await this.passwords.verify(hash, password);

    if (!user || !user.passwordHash || !ok) {
      throw new UnauthorizedAppException(
        'Invalid email or password.',
        ErrorCode.INVALID_CREDENTIALS,
      );
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenAppException('This account is not active.', ErrorCode.FORBIDDEN);
    }

    await this.users.recordLogin(user.id);
    return this.issueTokens(user, ctx);
  }

  /**
   * Rotates a refresh token. The presented token must match a live session.
   * If a token that has already been rotated (replaced) is presented, that
   * signals theft/replay: we revoke the entire session lineage.
   */
  async refresh(refreshToken: string, ctx: SessionContext): Promise<AuthTokensDto> {
    const hash = this.tokens.hashToken(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: hash },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedAppException('Invalid refresh token.', ErrorCode.INVALID_TOKEN);
    }

    // Reuse detection: a revoked/replaced token being presented again.
    if (session.revokedAt || session.replacedById) {
      await this.revokeUserSessions(session.userId);
      this.logger.warn(
        { userId: session.userId, sessionId: session.id },
        'Refresh token reuse detected; revoked all sessions',
      );
      throw new UnauthorizedAppException(
        'Refresh token has been invalidated.',
        ErrorCode.INVALID_TOKEN,
      );
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedAppException('Refresh token expired.', ErrorCode.TOKEN_EXPIRED);
    }
    if (session.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenAppException('This account is not active.', ErrorCode.FORBIDDEN);
    }

    // Issue a new session and point the old one at it (rotation chain).
    const tokens = await this.issueTokens(session.user, ctx, session.id);
    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = this.tokens.hashToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.consumeOneTimeToken(token, EMAIL_VERIFY);
    await this.users.markEmailVerified(user.id);
  }

  /**
   * Always returns success to avoid revealing whether an email is registered.
   * Only sends a reset mail when the account actually exists.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      return;
    }
    const { token, hash } = this.tokens.generateOneTimeToken();
    await this.prisma.authToken.create({
      data: {
        userId: user.id,
        type: PASSWORD_RESET,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    await this.mailer.send({
      to: user.email,
      subject: 'Reset your RentTrust password',
      text: `Use this token to reset your password: ${token}\nThis token expires in 1 hour. If you did not request this, ignore this email.`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.consumeOneTimeToken(token, PASSWORD_RESET);
    const passwordHash = await this.passwords.hash(newPassword);
    await this.users.update(user.id, { passwordHash });
    // Resetting a password invalidates every existing session.
    await this.revokeUserSessions(user.id);
  }

  // --------------------------------------------------------------------------

  private async issueTokens(
    user: User,
    ctx: SessionContext,
    replaceSessionId?: string,
  ): Promise<AuthTokensDto> {
    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      emailVerified: user.emailVerifiedAt != null,
    });

    const { token: refreshToken, hash } = this.tokens.generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.tokens.refreshTtlMs());

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: hash,
          userAgent: ctx.userAgent,
          ip: ctx.ip,
          expiresAt,
        },
      });
      if (replaceSessionId) {
        await tx.session.update({
          where: { id: replaceSessionId },
          data: { revokedAt: new Date(), replacedById: created.id },
        });
      }
    });

    const accessTtlMs = parseDurationMs(this.config.get('jwt', { infer: true }).accessTtl);
    return { accessToken, refreshToken, expiresIn: Math.floor(accessTtlMs / 1000) };
  }

  private async revokeUserSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async sendEmailVerification(user: User): Promise<void> {
    const { token, hash } = this.tokens.generateOneTimeToken();
    await this.prisma.authToken.create({
      data: {
        userId: user.id,
        type: EMAIL_VERIFY,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    await this.mailer.send({
      to: user.email,
      subject: 'Verify your RentTrust email',
      text: `Welcome to RentTrust. Verify your email with this token: ${token}\nThis token expires in 24 hours.`,
    });
  }

  /** Validates and single-use-consumes an email-verify / reset token. */
  private async consumeOneTimeToken(token: string, type: string): Promise<User> {
    const hash = this.tokens.hashToken(token);
    const record = await this.prisma.authToken.findFirst({
      where: { tokenHash: hash, type, usedAt: null },
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedAppException('Invalid or expired token.', ErrorCode.INVALID_TOKEN);
    }
    await this.prisma.authToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return this.users.getById(record.userId);
  }
}
