import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';
import { clearRefreshCookie, readRefreshCookie } from '@/lib/bff';

export async function POST() {
  const refreshToken = readRefreshCookie();
  if (refreshToken) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    }).catch(() => undefined);
  }
  const res = NextResponse.json({ success: true, data: { ok: true } });
  clearRefreshCookie(res);
  return res;
}
