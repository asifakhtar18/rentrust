import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * The authenticated principal attached to the request by JwtAuthGuard.
 * Deliberately minimal — never carries sensitive fields like the password hash.
 */
export interface AuthUser {
  id: string;
  email: string;
  roles: UserRole[];
  emailVerified: boolean;
}

/**
 * Injects the authenticated user (or a single property of it) into a handler.
 * Usage: `@CurrentUser() user: AuthUser` or `@CurrentUser('id') id: string`.
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthUser | undefined,
    ctx: ExecutionContext,
  ): AuthUser | AuthUser[keyof AuthUser] | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    // On @OptionalAuth() routes an anonymous caller has no user; return
    // undefined so the handler can decide. On fully-guarded routes the guard
    // guarantees a user before the handler runs.
    if (!user) {
      return undefined;
    }
    return data ? user[data] : user;
  },
);
