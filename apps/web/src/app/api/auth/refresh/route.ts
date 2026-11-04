/* ------------------------------------------------------------------ */
/*  BFF: POST /api/auth/refresh                                        */
/*  Reads the refresh-token cookie, rotates it against the backend,    */
/*  stores the new refresh token, and returns a fresh access token.    */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import {
  backendAuth,
  clearRefreshCookie,
  noStore,
  readRefreshCookie,
  setRefreshCookie,
} from '@/lib/bff';
import type { AuthTokens } from '@/lib/types';

export async function POST() {
  const refreshToken = await readRefreshCookie();

  if (!refreshToken) {
    // An anonymous visitor is a normal state; 204 keeps the browser console
    // clear while AuthProvider treats the empty response as no session.
    return noStore(new NextResponse(null, { status: 204 }));
  }

  const { ok, status, data } = await backendAuth<
    { success: boolean; data: AuthTokens; error?: unknown }
  >('/auth/refresh', { refreshToken });

  if (!ok) {
    if (status === 401 || status === 403) {
      const res = noStore(new NextResponse(null, { status: 204 }));
      clearRefreshCookie(res);
      return res;
    }
    const res = noStore(NextResponse.json(data, { status }));
    // Keep the session cookie during an upstream outage so the client can retry.
    // Authentication failures are normalized above and clear the stale cookie.
    return res;
  }

  const tokens = data.data;
  const res = noStore(NextResponse.json({ accessToken: tokens.accessToken }));
  setRefreshCookie(res, tokens.refreshToken);
  return res;
}
