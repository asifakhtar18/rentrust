'use client';

/* ------------------------------------------------------------------ */
/*  Client providers wrapper. Mounted once in the root layout so the   */
/*  auth context is available throughout the app.                      */
/* ------------------------------------------------------------------ */

import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/components/theme/theme-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
