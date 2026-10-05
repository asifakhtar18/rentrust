import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Password hashing abstraction. Argon2id is the current best-practice choice
 * for password storage (memory-hard, resistant to GPU attacks). Isolating it
 * behind a service means the algorithm/params can change in one place and the
 * rest of the code never touches raw crypto.
 */
@Injectable()
export class PasswordService {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB — OWASP-recommended floor
    timeCost: 2,
    parallelism: 1,
  };

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      // Malformed hash or mismatch — treat as a failed verification, never throw.
      return false;
    }
  }
}
