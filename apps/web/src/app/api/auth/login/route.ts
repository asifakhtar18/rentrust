/* ------------------------------------------------------------------ */
/*  BFF: POST /api/auth/login                                          */
/*  Proxies to the backend, stores the refresh token in an httpOnly    */
/*  cookie, and returns only the access token to the client.           */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { backendAuth, noStore, setRefreshCookie } from '@/lib/bff';
import type { AuthTokens } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const { ok, status, data } = await backendAuth<
    { success: boolean; data: AuthTokens; error?: unknown }
  >('/auth/login', {
    email: body.email,
    password: body.password,
  }, { clientIp: req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() });

  if (!ok) {
    return noStore(NextResponse.json(data, { status }));
  }

  const tokens = data.data;
  const res = noStore(NextResponse.json({ accessToken: tokens.accessToken }));
  setRefreshCookie(res, tokens.refreshToken);
  return res;
}
