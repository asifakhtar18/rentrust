'use client';

/* ------------------------------------------------------------------ */
/*  Client-side auth context.                                          */
/*  Holds the access token in memory (never localStorage) and          */
/*  refreshes it via the BFF /api/auth/refresh route.                  */
/* ------------------------------------------------------------------ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { AuthUser } from './types';
import { ApiError, getApiBaseUrl } from './api';

// ---- Types ----

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Authenticated fetch: attaches the in-memory access token and retries
   *  once on 401 after a silent refresh. */
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---- Provider ----

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
  });
  const tokenRef = useRef<string | null>(null);

  // -- internal helpers --

  /** Call the BFF refresh endpoint to get a new access token. */
  const silentRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (!res.ok) return null;
      const body = await res.json();
      tokenRef.current = body.accessToken ?? null;
      return tokenRef.current;
    } catch {
      return null;
    }
  }, []);

  /** Fetch /auth/me using the current access token. */
  const fetchMe = useCallback(async (token: string): Promise<AuthUser | null> => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const body = await res.json();
      return body.data ?? null;
    } catch {
      return null;
    }
  }, []);

  // -- public methods --

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(
          res.status,
          body?.error?.code ?? 'LOGIN_FAILED',
          body?.error?.message ?? 'Login failed',
        );
      }
      const body = await res.json();
      tokenRef.current = body.accessToken;
      const user = await fetchMe(body.accessToken);
      setState({ user, loading: false });
    },
    [fetchMe],
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(
          res.status,
          body?.error?.code ?? 'REGISTER_FAILED',
          body?.error?.message ?? 'Registration failed',
        );
      }
      const body = await res.json();
      if (body.verificationRequired) {
        tokenRef.current = null;
        setState({ user: null, loading: false });
        return true;
      }
      tokenRef.current = body.accessToken;
      const user = await fetchMe(body.accessToken);
      setState({ user, loading: false });
      return false;
    },
    [fetchMe],
  );

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    tokenRef.current = null;
    setState({ user: null, loading: false });
  }, []);

  const refreshUser = useCallback(async () => {
    const token = tokenRef.current ?? (await silentRefresh());
    if (!token) {
      setState({ user: null, loading: false });
      return;
    }
    const user = await fetchMe(token);
    setState({ user, loading: false });
  }, [fetchMe, silentRefresh]);

  /** Authenticated fetch with 401-retry. */
  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const url = path.startsWith('http') ? path : `${getApiBaseUrl()}${path}`;

      const doFetch = async (token: string | null) => {
        const headers = new Headers(init?.headers);
        if (token) headers.set('Authorization', `Bearer ${token}`);
        if (
          init?.body &&
          typeof init.body === 'string' &&
          !headers.has('Content-Type')
        ) {
          headers.set('Content-Type', 'application/json');
        }
        return fetch(url, { ...init, headers });
      };

      let res = await doFetch(tokenRef.current);

      // On 401, try a silent refresh and retry once.
      if (res.status === 401) {
        const newToken = await silentRefresh();
        if (newToken) {
          res = await doFetch(newToken);
        }
      }

      if (!res.ok) {
        let code = 'UNKNOWN';
        let message = res.statusText;
        try {
          const body = await res.json();
          if (body?.error) {
            code = body.error.code;
            message = body.error.message;
          }
        } catch {
          /* ignore */
        }
        throw new ApiError(res.status, code, message);
      }

      const body = await res.json();
      return body.data as T;
    },
    [silentRefresh],
  );

  // -- mount: attempt a silent refresh --

  useEffect(() => {
    silentRefresh().then(async (token) => {
      if (token) {
        const user = await fetchMe(token);
        setState({ user, loading: false });
      } else {
        setState({ user: null, loading: false });
      }
    });
  }, [silentRefresh, fetchMe]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshUser,
        request,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---- Hook ----

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
