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
    return noStore(NextResponse.json(
      { error: { code: 'NO_SESSION', message: 'No active session.' } },
      { status: 401 },
    ));
  }

  const { ok, status, data } = await backendAuth<
    { success: boolean; data: AuthTokens; error?: unknown }
  >('/auth/refresh', { refreshToken });

  if (!ok) {
    const res = noStore(NextResponse.json(data, { status }));
    // Keep the session cookie during an upstream outage so the client can retry.
    // Clear it only when the backend has definitively rejected the session.
    if (status === 401 || status === 403) clearRefreshCookie(res);
    return res;
  }

  const tokens = data.data;
  const res = noStore(NextResponse.json({ accessToken: tokens.accessToken }));
  setRefreshCookie(res, tokens.refreshToken);
  return res;
}
