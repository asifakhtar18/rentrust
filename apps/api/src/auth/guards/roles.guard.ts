import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ForbiddenAppException, UnauthorizedAppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';

/**
 * Enforces role requirements declared with @Roles(...). Runs after
 * JwtAuthGuard, so the user is already attached. ADMIN implicitly satisfies any
 * role requirement.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedAppException('Authentication required.', ErrorCode.UNAUTHORIZED);
    }

    const roles = new Set(user.roles);
    const allowed = roles.has(UserRole.ADMIN) || required.some((r) => roles.has(r));
    if (!allowed) {
      throw new ForbiddenAppException('You do not have permission to perform this action.');
    }
    return true;
  }
}
