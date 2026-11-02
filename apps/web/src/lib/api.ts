/* ------------------------------------------------------------------ */
/*  Thin API client. Unwraps the backend's { success, data, meta }     */
/*  envelope and throws on errors.                                     */
/* ------------------------------------------------------------------ */

import type { ApiMeta } from './types';

/** Resolve the backend at call time so a missing production URL is reported
 * when a request is made, without breaking static page generation. */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  const base =
    configured ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:4000/api/v1' : '');
  if (!base) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must be configured for production.');
  }
  return base.replace(/\/+$/, '');
}

// ---- Error class ----

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---- Core fetch wrapper ----

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: ApiMeta;
}

interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: Record<string, unknown> };
  meta?: ApiMeta;
}

export interface ApiResult<T> {
  data: T;
  meta?: ApiMeta;
}

/**
 * Generic fetch wrapper that calls the backend API and unwraps the
 * standard `{ success, data, meta }` envelope.
 *
 * Pass an `accessToken` to attach a Bearer header.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { accessToken?: string },
): Promise<ApiResult<T>> {
  const { accessToken, ...fetchInit } = init ?? {};

  const headers = new Headers(fetchInit.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (fetchInit.body && typeof fetchInit.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = path.startsWith('http') ? path : `${getApiBaseUrl()}${path}`;

  const res = await fetch(url, { ...fetchInit, headers });

  if (!res.ok) {
    let code = 'UNKNOWN';
    let message = res.statusText;
    let details: Record<string, unknown> | undefined;

    try {
      const body = (await res.json()) as ApiErrorEnvelope;
      if (body?.error) {
        code = body.error.code;
        message = body.error.message;
        details = body.error.details;
      }
    } catch {
      /* body wasn't JSON — use defaults */
    }

    throw new ApiError(res.status, code, message, details);
  }

  const body = (await res.json()) as ApiEnvelope<T>;
  return { data: body.data, meta: body.meta };
}

// ---- Query-string helper ----

/**
 * Builds a query string from a params object, omitting undefined/null values.
 *
 * ```ts
 * qs({ q: 'park', limit: 10, type: undefined })  // '?q=park&limit=10'
 * ```
 */
export function qs(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}
