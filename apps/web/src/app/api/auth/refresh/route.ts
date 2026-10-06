/* ------------------------------------------------------------------ */
/*  BFF: POST /api/auth/refresh                                        */
/*  Reads the refresh-token cookie, rotates it against the backend,    */
/*  stores the new refresh token, and returns a fresh access token.    */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import {
  backendAuth,
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from '@/lib/bff';
import type { AuthTokens } from '@/lib/types';

export async function POST() {
  const refreshToken = await readRefreshCookie();

  if (!refreshToken) {
    return NextResponse.json(
      { error: { code: 'NO_SESSION', message: 'No active session.' } },
      { status: 401 },
    );
  }

  const { ok, status, data } = await backendAuth<
    { success: boolean; data: AuthTokens; error?: unknown }
  >('/auth/refresh', { refreshToken });

  if (!ok) {
    // The refresh token is stale/invalid — clear the cookie.
    const res = NextResponse.json(data, { status });
    clearRefreshCookie(res);
    return res;
  }

  const tokens = data.data;
  const res = NextResponse.json({ accessToken: tokens.accessToken });
  setRefreshCookie(res, tokens.refreshToken);
  return res;
}
