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

  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<{ data: T; meta: ApiMeta }> => {
      const call = () =>
        fetch(`${API_BASE_URL}${path}`, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken.current ? { Authorization: `Bearer ${accessToken.current}` } : {}),
            ...(init.headers ?? {}),
          },
          cache: 'no-store',
        });

      let res = await call();
      if (res.status === 401 && (await doRefresh())) res = await call();

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

  const authAction = useCallback(
    async (endpoint: string, payload: Record<string, unknown>) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as
        | { success: true; data: { accessToken: string } }
        | { success: false; error: { code: string; message: string } };
      if (!res.ok || body.success === false) {
        const msg = body.success === false ? body.error.message : 'Request failed';
        throw new ApiError(body.success === false ? body.error.code : 'UNKNOWN', msg, res.status);
      }
      accessToken.current = body.data.accessToken;
      await refreshUser();
    },
    [refreshUser],
  );

  const login = useCallback((email: string, password: string) => authAction('/api/auth/login', { email, password }), [authAction]);
  const register = useCallback(
    (email: string, password: string, displayName?: string) =>
      authAction('/api/auth/register', { email, password, displayName }),
    [authAction],
  );
  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    accessToken.current = null;
    setUser(null);
  }, []);

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
