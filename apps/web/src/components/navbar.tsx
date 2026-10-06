'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';
import { Button, LinkButton } from './ui';

/* Linear-style floating nav: tight height, zinc base, hairline border. */

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.roles.some((r) => r === 'ADMIN' || r === 'MODERATOR');

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        'text-sm transition-colors',
        pathname === href ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200',
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-emerald-500 text-xs font-bold text-emerald-950">
            R
          </span>
          <span className="text-sm font-semibold text-zinc-100">RentTrust</span>
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          {link('/search', 'Search')}
          {link('/compare', 'Compare')}
          {user && link('/saved', 'Saved')}
          {isAdmin && link('/admin', 'Console')}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!loading && !user && (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">
                Sign in
              </LinkButton>
              <LinkButton href="/register" variant="primary" size="sm">
                Get started
              </LinkButton>
            </>
          )}
          {!loading && user && (
            <div className="relative">
              <button
                onClick={() => setOpen((o) => !o)}
                className="flex size-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                aria-label="Account"
                aria-expanded={open}
              >
                {(user.displayName ?? user.email).slice(0, 1).toUpperCase()}
              </button>
              {open && (
                <div
                  className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-elevated"
                  onMouseLeave={() => setOpen(false)}
                >
                  <MenuItem href="/profile" onClick={() => setOpen(false)}>Profile</MenuItem>
                  <MenuItem href="/saved" onClick={() => setOpen(false)}>Saved</MenuItem>
                  {isAdmin && <MenuItem href="/admin" onClick={() => setOpen(false)}>Console</MenuItem>}
                  <div className="my-1 h-px bg-zinc-800" />
                  <button
                    className="w-full rounded-md px-3 py-1.5 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                    onClick={() => { setOpen(false); void logout(); }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

function MenuItem({ href, children, onClick }: { href: string; children: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
    >
      {children}
    </Link>
  );
}
