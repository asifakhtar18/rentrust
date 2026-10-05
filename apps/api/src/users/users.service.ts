import { Injectable } from '@nestjs/common';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { NotFoundAppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';

/**
 * Owns all persistence for users and their resident profile. Business rules
 * that span modules stay out of here; this is the single source of truth for
 * reading and mutating user rows.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  async getById(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundAppException('User not found', ErrorCode.USER_NOT_FOUND);
    }
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  /**
   * Creates a user together with a resident profile (every account is a
   * potential reviewer). The public alias is a non-identifying handle used on
   * public review surfaces so the real identity is never exposed.
   */
  async createWithProfile(input: {
    email: string;
    passwordHash: string;
    displayName?: string;
    roles?: UserRole[];
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        displayName: input.displayName,
        roles: input.roles ?? [UserRole.USER],
        residentProfile: {
          create: { publicAlias: this.generatePublicAlias() },
        },
      },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  markEmailVerified(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { emailVerifiedAt: new Date() },
    });
  }

  recordLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Soft-deletes the account and scrubs identifying fields (GDPR-style data
   * minimization). Reviews are retained but detached from identity by the
   * public-alias design.
   */
  async softDeleteAndAnonymize(id: string): Promise<void> {
    const tombstone = `deleted+${id}@rentrust.invalid`;
    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.DELETED,
        deletedAt: new Date(),
        email: tombstone,
        phone: null,
        passwordHash: null,
        displayName: null,
      },
    });
  }

  private generatePublicAlias(): string {
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `Verified Resident #${suffix}`;
  }
}
