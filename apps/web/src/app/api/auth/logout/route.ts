/* ------------------------------------------------------------------ */
/*  BFF: POST /api/auth/logout                                         */
/*  Revokes the refresh token on the backend and clears the cookie.    */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { backendAuth, clearRefreshCookie, noStore, readRefreshCookie } from '@/lib/bff';

export async function POST() {
  const refreshToken = await readRefreshCookie();

  if (refreshToken) {
    // Best-effort revoke; ignore backend errors so logout always succeeds.
    await backendAuth('/auth/logout', { refreshToken }).catch(() => {});
  }

  const res = noStore(NextResponse.json({ success: true }));
  clearRefreshCookie(res);
  return res;
}
