import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_BASE_URL } from './api';

/**
 * Server-only helpers shared by the auth BFF route handlers. The refresh token
 * is stored in an httpOnly, Secure, SameSite cookie set on the Vercel origin —
 * never exposed to client JS — so an XSS flaw cannot exfiltrate it. The access
 * token is returned to the client and held in memory only.
 */

const REFRESH_COOKIE = 'rt';
const isProd = process.env.NODE_ENV === 'production';

export interface BackendTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function setRefreshCookie(res: NextResponse, refreshToken: string): void {
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearRefreshCookie(res: NextResponse): void {
  res.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export function readRefreshCookie(): string | undefined {
  return cookies().get(REFRESH_COOKIE)?.value;
}

/** Proxies to the backend auth endpoint and returns the parsed token payload. */
export async function backendAuth(
  path: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true; tokens: BackendTokens } | { ok: false; status: number; body: unknown }> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => null)) as
    | { success: boolean; data?: BackendTokens }
    | null;
  if (!res.ok || !body?.success || !body.data) {
    return { ok: false, status: res.status, body };
  }
  return { ok: true, tokens: body.data };
}
