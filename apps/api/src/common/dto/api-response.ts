/**
 * Shared response envelope types. Every successful response is wrapped as
 * `{ success: true, data, meta }` and every error as
 * `{ success: false, error: { code, message } }`. Enforced globally by the
 * response interceptor and the exception filter respectively.
 */

export interface ApiMeta {
  requestId?: string;
  [key: string]: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: ApiMeta;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Marker used by the response interceptor: a handler may return a value already
 * shaped with pagination/meta so the interceptor merges it instead of nesting.
 */
export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
