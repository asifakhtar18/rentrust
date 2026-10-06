import type { ApiMeta } from './types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiResult<T> {
  data: T;
  meta: ApiMeta;
}

interface EnvelopeSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}
interface EnvelopeError {
  success: false;
  error: { code: string; message: string };
  meta?: ApiMeta;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<ApiResult<T>> {
  const { accessToken, headers, ...rest } = options;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(headers ?? {}),
    },
    cache: rest.cache ?? 'no-store',
  });

  let body: EnvelopeSuccess<T> | EnvelopeError | null = null;
  try {
    body = (await res.json()) as EnvelopeSuccess<T> | EnvelopeError;
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Unexpected response from server', res.status);
  }

  if (!body || body.success === false) {
    const err = body as EnvelopeError | null;
    throw new ApiError(err?.error.code ?? 'UNKNOWN', err?.error.message ?? 'Request failed', res.status);
  }
  return { data: body.data, meta: body.meta ?? {} };
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}
