/* ------------------------------------------------------------------ */
/*  BFF: POST /api/auth/login                                          */
/*  Proxies to the backend, stores the refresh token in an httpOnly    */
/*  cookie, and returns only the access token to the client.           */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { backendAuth, setRefreshCookie } from '@/lib/bff';
import type { AuthTokens } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const { ok, status, data } = await backendAuth<
    { success: boolean; data: AuthTokens; error?: unknown }
  >('/auth/login', {
    email: body.email,
    password: body.password,
  });

  if (!ok) {
    return NextResponse.json(data, { status });
  }

  const tokens = data.data;
  const res = NextResponse.json({ accessToken: tokens.accessToken });
  setRefreshCookie(res, tokens.refreshToken);
  return res;
}
