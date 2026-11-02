import { Injectable } from '@nestjs/common';
import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto';
import * as argon2 from 'argon2';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);
const ITERATIONS = 600_000;
const KEY_LENGTH = 32;

/**
 * Password hashing abstraction for the NestJS API.
 * Legacy hashes remain verifiable during the account migration.
 */
@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(16);
    const derived = await pbkdf2Async(plain, salt, ITERATIONS, KEY_LENGTH, 'sha256');
    return `pbkdf2$sha256$${ITERATIONS}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      if (hash.startsWith('$argon2')) return await argon2.verify(hash, plain);
      const [algorithm, digest, iterationText, saltText, derivedText, ...extra] = hash.split('$');
      const iterations = Number(iterationText);
      if (
        algorithm !== 'pbkdf2' ||
        digest !== 'sha256' ||
        extra.length ||
        !Number.isInteger(iterations) ||
        iterations < 100_000 ||
        iterations > 2_000_000
      )
        return false;
      const salt = Buffer.from(saltText, 'base64url');
      const expected = Buffer.from(derivedText, 'base64url');
      if (salt.length < 16 || expected.length !== KEY_LENGTH) return false;
      const actual = await pbkdf2Async(plain, salt, iterations, KEY_LENGTH, 'sha256');
      return timingSafeEqual(actual, expected);
    } catch {
      // Malformed hash or mismatch — treat as a failed verification, never throw.
      return false;
    }
  }
}
