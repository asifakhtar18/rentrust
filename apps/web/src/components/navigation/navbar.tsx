'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ShieldCheck, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';
import { Button, LinkButton } from '@/components/ui/button';

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.roles.some((r) => r === 'ADMIN' || r === 'MODERATOR');

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        'text-[14px] transition-colors',
        pathname === href ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="material sticky top-0 z-50 border-b border-border/60">
      <nav className="mx-auto flex h-12 max-w-[1024px] items-center gap-8 px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" aria-hidden />
          </span>
          <span className="t-body font-semibold tracking-tight text-foreground">RenTrust</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {link('/search', 'Search')}
          {link('/compare', 'Compare')}
          {user && link('/saved', 'Saved')}
          {user && link('/notifications', 'Notifications')}
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
                className="flex items-center gap-1.5 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-muted"
                aria-label="Account menu"
                aria-expanded={open}
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary">
                  {(user.displayName ?? user.email).slice(0, 1).toUpperCase()}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
              </button>
              {open && (
                <div
                  className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-border bg-card p-1 shadow-md"
                  onMouseLeave={() => setOpen(false)}
                >
                  <MenuItem href="/profile" onClick={() => setOpen(false)}>Profile</MenuItem>
                  <MenuItem href="/saved" onClick={() => setOpen(false)}>Saved properties</MenuItem>
                  <MenuItem href="/notifications" onClick={() => setOpen(false)}>Notifications</MenuItem>
                  {isAdmin && <MenuItem href="/admin" onClick={() => setOpen(false)}>Console</MenuItem>}
                  <div className="my-1 h-px bg-border" />
                  <button
                    className="w-full rounded-md px-3 py-1.5 text-left text-[14px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
      className="block rounded-md px-3 py-1.5 text-[14px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  );
}
