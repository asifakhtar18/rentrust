'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';
import { Button, LinkButton } from './ui';

/**
 * Top navigation — a translucent material bar that stays out of the way. Links
 * are role-aware: admin/moderator see the console entry; signed-in users see
 * saved + profile; everyone can search.
 */
export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = user?.roles.some((r) => r === 'ADMIN' || r === 'MODERATOR');

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        'rounded-full px-3.5 py-1.5 text-footnote font-medium transition-all duration-200 ease-out',
        pathname === href
          ? 'bg-accent/10 text-accent'
          : 'text-ink-secondary hover:text-ink hover:bg-ink/5',
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 material border-b border-hairline/10">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-5">
        <Link href="/" className="mr-3 flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-callout tracking-tight text-ink">RentTrust</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLink('/search', 'Search')}
          {navLink('/compare', 'Compare')}
          {user && navLink('/saved', 'Saved')}
          {isAdmin && navLink('/admin', 'Console')}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!loading && !user && (
            <>
              <LinkButton href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
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
                onClick={() => setMenuOpen((o) => !o)}
                className="flex size-9 items-center justify-center rounded-full bg-accent/10 text-footnote font-semibold text-accent transition-transform active:scale-95"
                aria-label="Account menu"
                aria-expanded={menuOpen}
              >
                {(user.displayName ?? user.email).slice(0, 1).toUpperCase()}
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 animate-scale-in rounded-2xl bg-surface p-1.5 shadow-raised"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <MenuLink href="/profile" onClick={() => setMenuOpen(false)}>
                    Profile
                  </MenuLink>
                  <MenuLink href="/saved" onClick={() => setMenuOpen(false)}>
                    Saved properties
                  </MenuLink>
                  {isAdmin && (
                    <MenuLink href="/admin" onClick={() => setMenuOpen(false)}>
                      Console
                    </MenuLink>
                  )}
                  <div className="my-1 h-px bg-hairline/10" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setMenuOpen(false);
                      void logout();
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

function MenuLink({ href, children, onClick }: { href: string; children: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-xl px-3 py-2 text-footnote text-ink-secondary transition-colors hover:bg-ink/5 hover:text-ink"
    >
      {children}
    </Link>
  );
}

function Logo() {
  return (
    <span
      className="flex size-9 items-center justify-center rounded-xl text-accent-ink shadow-glow"
      style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--violet)))' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3.2 4.5 8.4v9.1c0 .6.5 1.1 1.1 1.1h3.1v-5.3c0-.6.5-1.1 1.1-1.1h4.2c.6 0 1.1.5 1.1 1.1v5.3h3.1c.6 0 1.1-.5 1.1-1.1V8.4L12 3.2Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
