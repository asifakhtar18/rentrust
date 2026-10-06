/* ------------------------------------------------------------------ */
/*  Server-only BFF helpers. These run in Next.js route handlers and   */
/*  server components — never shipped to the browser.                  */
/* ------------------------------------------------------------------ */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'rt';
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

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
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json };
}
