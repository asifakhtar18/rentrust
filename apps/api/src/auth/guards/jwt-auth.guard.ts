import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { IS_OPTIONAL_AUTH_KEY } from '../../common/decorators/optional-auth.decorator';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { UnauthorizedAppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { TokenService } from '../services/token.service';

/**
 * Global authentication guard. Verifies the bearer access token and attaches a
 * minimal AuthUser to the request. Routes marked @Public() are skipped
 * entirely; routes marked @OptionalAuth() attach the user when a valid token is
 * present but never reject anonymous callers.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const optional = this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthUser }>();
    const token = this.extractToken(request);

    if (!token) {
      if (optional) {
        return true;
      }
      throw new UnauthorizedAppException('Authentication required.', ErrorCode.UNAUTHORIZED);
    }

    try {
      const claims = await this.tokens.verifyAccessToken(token);
      request.user = {
        id: claims.sub,
        email: claims.email,
        roles: claims.roles,
        emailVerified: claims.emailVerified,
      };
      return true;
    } catch {
      if (optional) {
        return true;
      }
      throw new UnauthorizedAppException(
        'Invalid or expired access token.',
        ErrorCode.INVALID_TOKEN,
      );
    }
  }

  private extractToken(request: FastifyRequest): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }
    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && value ? value : null;
  }
}
