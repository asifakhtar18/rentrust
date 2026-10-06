'use client';

/* ------------------------------------------------------------------ */
/*  Client providers wrapper. Mounted once in the root layout so the   */
/*  auth context is available throughout the app.                      */
/* ------------------------------------------------------------------ */

import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
