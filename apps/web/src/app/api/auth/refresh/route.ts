import { NextResponse } from 'next/server';
import { backendAuth, clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '@/lib/bff';

/**
 * BFF: rotate the refresh token. Reads the httpOnly cookie, calls the backend
 * (which rotates + detects reuse), sets the new cookie, and returns a fresh
 * access token. On failure the cookie is cleared so the client logs out.
 */
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
