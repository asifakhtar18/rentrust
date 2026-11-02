/* ------------------------------------------------------------------ */
/*  Server-only BFF helpers. These run in Next.js route handlers and   */
/*  server components — never shipped to the browser.                  */
/* ------------------------------------------------------------------ */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getApiBaseUrl } from './api';

const COOKIE_NAME = 'rt';

/** Prevent token-bearing BFF responses from being cached by browsers or CDNs. */
export function noStore(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'no-store, private');
  res.headers.set('Pragma', 'no-cache');
  return res;
}

// ---- Cookie helpers ----

/**
 * Sets the refresh-token cookie on a NextResponse.
 * httpOnly + secure + sameSite=lax + path=/ — never readable from JS.
 */
export function setRefreshCookie(res: NextResponse, refreshToken: string) {
  res.cookies.set(COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

/** Clears the refresh-token cookie on a NextResponse. */
export function clearRefreshCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/** Reads the refresh-token from the incoming request cookies. */
export async function readRefreshCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value;
}

// ---- Backend proxy helper ----

/**
 * Forwards a request to the backend auth endpoint with the correct
 * Content-Type header. Returns the parsed JSON body.
 */
export async function backendAuth<T>(
  path: string,
  body: Record<string, unknown>,
  options: { clientIp?: string } = {},
): Promise<{ ok: boolean; status: number; data: T }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = process.env.BFF_PROXY_SECRET;
  const clientIp = options.clientIp;
  if (clientIp && !secret) throw new Error('BFF_PROXY_SECRET is not configured for the auth proxy.');
  if (secret && clientIp && /^[0-9a-f:.]+$/i.test(clientIp)) {
    const timestamp = String(Date.now());
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${clientIp}`)),
    );
    headers['X-RenTrust-Client-IP'] = clientIp;
    headers['X-RenTrust-Client-IP-Timestamp'] = timestamp;
    headers['X-RenTrust-Client-IP-Signature'] = Array.from(signature, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  const unavailable = (status: number, code: string, message: string) => ({
    ok: false,
    status,
    data: { success: false, error: { code, message } } as T,
  });
  const url = `${getApiBaseUrl()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return unavailable(503, 'AUTH_BACKEND_UNAVAILABLE', 'Authentication service is temporarily unavailable. Please try again.');
  }

  const json: unknown = await res.json().catch(() => null);
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return unavailable(
      res.ok ? 502 : res.status,
      'AUTH_BACKEND_ERROR',
      'Authentication service returned an invalid response. Please try again.',
    );
  }
  return { ok: res.ok, status: res.status, data: json as T };
}
