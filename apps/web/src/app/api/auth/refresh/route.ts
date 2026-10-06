import { NextResponse } from 'next/server';
import { backendAuth, clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '@/lib/bff';

export async function POST() {
  const refreshToken = readRefreshCookie();
  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'No session' } },
      { status: 401 },
    );
  }
  const result = await backendAuth('/auth/refresh', { refreshToken });
  if (!result.ok) {
    const res = NextResponse.json(result.body ?? { success: false }, { status: result.status });
    clearRefreshCookie(res);
    return res;
  }
  const res = NextResponse.json({
    success: true,
    data: { accessToken: result.tokens.accessToken, expiresIn: result.tokens.expiresIn },
  });
  setRefreshCookie(res, result.tokens.refreshToken);
  return res;
}
