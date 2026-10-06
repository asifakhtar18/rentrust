'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { API_BASE_URL, ApiError } from './api';
import type { ApiMeta, AuthUser } from './types';

/**
 * Client auth. The access token lives only in memory (a ref), never in
 * localStorage. The refresh token is an httpOnly cookie managed by the BFF.
 * `request` attaches the token and transparently refreshes once on a 401,
 * de-duplicating concurrent refreshes so a burst of 401s triggers one refresh.
 */

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  request: <T>(path: string, init?: RequestInit) => Promise<{ data: T; meta: ApiMeta }>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const accessToken = useRef<string | null>(null);
  const refreshing = useRef<Promise<boolean> | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /** Ask the BFF to rotate the refresh cookie and hand back a new access token. */
  const doRefresh = useCallback(async (): Promise<boolean> => {
    if (refreshing.current) return refreshing.current;
    refreshing.current = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (!res.ok) {
          accessToken.current = null;
          return false;
        }
        const body = (await res.json()) as { data: { accessToken: string } };
        accessToken.current = body.data.accessToken;
        return true;
      } catch {
        accessToken.current = null;
        return false;
      } finally {
        refreshing.current = null;
      }
    })();
    return refreshing.current;
  }, []);

  /** Authenticated request against the backend with one transparent retry. */
  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<{ data: T; meta: ApiMeta }> => {
      const call = async () => {
        const res = await fetch(`${API_BASE_URL}${path}`, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken.current ? { Authorization: `Bearer ${accessToken.current}` } : {}),
            ...(init.headers ?? {}),
          },
          cache: 'no-store',
        });
        return res;
      };

      let res = await call();
      if (res.status === 401 && (await doRefresh())) {
        res = await call();
      }

      const body = (await res.json().catch(() => null)) as
        | { success: true; data: T; meta?: ApiMeta }
        | { success: false; error: { code: string; message: string } }
        | null;

      if (!body || body.success === false) {
        const e = body as { error?: { code: string; message: string } } | null;
        throw new ApiError(e?.error?.code ?? 'UNKNOWN', e?.error?.message ?? 'Request failed', res.status);
      }
      return { data: body.data, meta: body.meta ?? {} };
    },
    [doRefresh],
  );

  const refreshUser = useCallback(async () => {
    if (!accessToken.current) {
      setUser(null);
      return;
    }
    try {
      const { data } = await request<AuthUser>('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    }
  }, [request]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as
        | { success: true; data: { accessToken: string } }
        | { success: false; error: { code: string; message: string } };
      if (!res.ok || body.success === false) {
        const msg = body.success === false ? body.error.message : 'Login failed';
        throw new ApiError(body.success === false ? body.error.code : 'UNKNOWN', msg, res.status);
      }
      accessToken.current = body.data.accessToken;
      await refreshUser();
    },
    [refreshUser],
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });
      const body = (await res.json()) as
        | { success: true; data: { accessToken: string } }
        | { success: false; error: { code: string; message: string } };
      if (!res.ok || body.success === false) {
        const msg = body.success === false ? body.error.message : 'Registration failed';
        throw new ApiError(body.success === false ? body.error.code : 'UNKNOWN', msg, res.status);
      }
      accessToken.current = body.data.accessToken;
      await refreshUser();
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    accessToken.current = null;
    setUser(null);
  }, []);

  // On mount, try to restore a session from the refresh cookie.
  useEffect(() => {
    (async () => {
      const ok = await doRefresh();
      if (ok) await refreshUser();
      setLoading(false);
    })();
  }, [doRefresh, refreshUser]);

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, register, logout, refreshUser, request }),
    [user, loading, login, register, logout, refreshUser, request],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
