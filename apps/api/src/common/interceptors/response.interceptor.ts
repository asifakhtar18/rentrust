import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccess } from '../dto/api-response';

/**
 * Wraps every successful handler return value in the standard success envelope.
 * If the handler already returns `{ data, meta }`, the meta is preserved and
 * merged with the request id. Handlers return `{ data }` (optionally `{ data,
 * meta }`) by convention; anything else is treated as the data itself.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccess<unknown>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<unknown>> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { id?: string }>();
    const requestId = (request as { id?: string }).id;

    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'data' in (payload as object) &&
          !('success' in (payload as object))
        ) {
          const { data, meta } = payload as unknown as {
            data: unknown;
            meta?: Record<string, unknown>;
          };
          return {
            success: true,
            data,
            meta: { requestId, ...(meta ?? {}) },
          };
        }

        return {
          success: true,
          data: payload ?? null,
          meta: { requestId },
        };
      }),
    );
  }
}
