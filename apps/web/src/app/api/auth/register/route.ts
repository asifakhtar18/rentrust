import { NextRequest, NextResponse } from 'next/server';
import { backendAuth, setRefreshCookie } from '@/lib/bff';

/** BFF: proxy registration, stash the refresh token in an httpOnly cookie. */
export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await backendAuth('/auth/register', payload);
  if (!result.ok) {
    return NextResponse.json(result.body ?? { success: false }, { status: result.status });
  }
  const res = NextResponse.json({
    success: true,
    data: { accessToken: result.tokens.accessToken, expiresIn: result.tokens.expiresIn },
  });
  setRefreshCookie(res, result.tokens.refreshToken);
  return res;
}
