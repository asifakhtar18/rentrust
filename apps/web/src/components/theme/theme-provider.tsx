'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'rentrust-theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    } catch {
      // Private browsing or a storage policy can block localStorage.
    }
    setReady(true);

    const syncOtherTabs = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setTheme(event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'system');
    };
    window.addEventListener('storage', syncOtherTabs);
    return () => window.removeEventListener('storage', syncOtherTabs);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const next: ResolvedTheme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.classList.toggle('dark', next === 'dark');
      document.documentElement.style.colorScheme = next;
      setResolvedTheme(next);
    };
    apply();
    if (theme === 'system') media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [ready, theme]);

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Theme still changes for this session when persistence is unavailable.
    }
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, toggleTheme }),
    [theme, resolvedTheme, toggleTheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider.');
  return value;
}
