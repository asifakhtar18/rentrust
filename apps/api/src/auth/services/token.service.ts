import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';
import { AppConfig } from '../../config/configuration';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  roles: UserRole[];
  emailVerified: boolean;
}

/**
 * Issues and verifies JWT access tokens and generates opaque refresh tokens.
 *
 * Why opaque refresh tokens: the refresh token is a high-value, long-lived
 * credential. We store only its SHA-256 hash in the DB (like a password), so a
 * database leak does not expose usable tokens, and we can revoke/rotate server
 * side. Access tokens stay short-lived and stateless.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async signAccessToken(claims: AccessTokenClaims): Promise<string> {
    const jwtCfg = this.config.get('jwt', { infer: true });
    return this.jwt.signAsync(claims, {
      secret: jwtCfg.accessSecret,
      expiresIn: jwtCfg.accessTtl,
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    const jwtCfg = this.config.get('jwt', { infer: true });
    return this.jwt.verifyAsync<AccessTokenClaims>(token, {
      secret: jwtCfg.accessSecret,
    });
  }

  /**
   * Generates a cryptographically-random opaque refresh token plus its hash.
   * Only the hash is persisted; the raw token is returned to the client once.
   */
  generateRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(48).toString('base64url');
    return { token, hash: this.hashToken(token) };
  }

  /** SHA-256 is appropriate here: the input is high-entropy random, not a password. */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Generates a single-use token (email verify / password reset) + its hash. */
  generateOneTimeToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: this.hashToken(token) };
  }

  refreshTtlMs(): number {
    const ttl = this.config.get('jwt', { infer: true }).refreshTtl;
    return parseDurationMs(ttl);
  }
}

/** Parses a short duration string like `30d`, `15m`, `900s`, `12h` into ms. */
export function parseDurationMs(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) {
    const asNumber = Number(input);
    if (!Number.isNaN(asNumber)) {
      return asNumber * 1000;
    }
    throw new Error(`Invalid duration: ${input}`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[unit];
}
