'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, Moon, ShieldCheck, Sun, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/components/theme/theme-provider';
import { cn } from '@/lib/cn';
import { Button, LinkButton } from '@/components/ui/button';

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const isStaff = user?.roles.some((role) => role === 'ADMIN' || role === 'MODERATOR') ?? false;
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    setAccountOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen && !mobileOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) {
        setAccountOpen(false);
        setMobileOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountOpen, mobileOpen]);

  const isCurrent = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
  const linkClass = (href: string) =>
    cn(
      'rounded-md px-2.5 py-2 text-[14px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
      isCurrent(href)
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    );

  const primaryLinks = [
    { href: '/search', label: 'Explore' },
    { href: '/map', label: 'Map' },
    { href: '/compare', label: 'Compare' },
    ...(user ? [{ href: '/properties/suggest', label: 'Suggest a property' }] : []),
    ...(user ? [{ href: '/locations/suggest', label: 'Add a locality' }] : []),
    ...(isStaff ? [{ href: '/admin', label: 'Staff console' }] : []),
  ];
  const memberLinks = user
    ? [
        { href: '/saved', label: 'Saved homes' },
        { href: '/notifications', label: 'Notifications' },
        { href: '/profile', label: 'Your account' },
      ]
    : [];

  return (
    <header ref={navRef} className="material sticky top-0 z-50 border-b border-border/70">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex min-h-14 max-w-[1200px] items-center gap-2 px-3.5 sm:gap-4 sm:px-6"
      >
        <Link
          href="/"
          aria-label="RenTrust home"
          className="flex shrink-0 items-center gap-1.5 sm:gap-2"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="size-4" aria-hidden />
          </span>
          <span className="font-serif text-[18px] tracking-tight text-foreground sm:text-[19px]">
            RenTrust
          </span>
        </Link>

        <div className="ml-1 hidden items-center gap-1 lg:flex">
          {primaryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? 'page' : undefined}
              className={linkClass(item.href)}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className="size-9 min-h-9 rounded-full border border-border/80 p-0 text-foreground hover:bg-muted"
          >
            {isDark ? (
              <Sun className="size-4" aria-hidden />
            ) : (
              <Moon className="size-4" aria-hidden />
            )}
          </Button>

          {!loading && !user && (
            <>
              <LinkButton href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </LinkButton>
              <LinkButton href="/register" variant="primary" size="sm" className="px-3 sm:px-3.5">
                Join
              </LinkButton>
            </>
          )}

          {!loading && user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
                className="flex min-h-9 items-center gap-1.5 rounded-full border border-border/80 py-1 pl-1 pr-2 transition-colors hover:bg-muted"
                aria-label="Open account menu"
                aria-expanded={accountOpen}
                aria-controls="account-menu"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary">
                  {(user.displayName ?? user.email).slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-24 truncate text-xs font-medium text-foreground xl:block">
                  {user.displayName?.split(' ')[0] ?? 'Account'}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
              </button>
              {accountOpen && (
                <div
                  id="account-menu"
                  className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg"
                >
                  <p className="truncate px-3 py-2 text-xs text-muted-foreground">{user.email}</p>
                  <div className="my-1 h-px bg-border" />
                  {memberLinks.map((item) => (
                    <MenuItem
                      key={item.href}
                      href={item.href}
                      current={isCurrent(item.href)}
                      onClick={() => setAccountOpen(false)}
                    >
                      {item.label}
                    </MenuItem>
                  ))}
                  {isStaff && (
                    <MenuItem
                      href="/admin"
                      current={isCurrent('/admin')}
                      onClick={() => setAccountOpen(false)}
                    >
                      Staff console
                    </MenuItem>
                  )}
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    className="min-h-10 w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      setAccountOpen(false);
                      void logout();
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted lg:hidden"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? (
              <X className="size-4" aria-hidden />
            ) : (
              <Menu className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-border bg-background px-3.5 py-3 sm:px-6 lg:hidden"
        >
          <div className="mx-auto grid max-w-[1200px] gap-1">
            {primaryLinks.map((item) => (
              <MobileLink
                key={item.href}
                href={item.href}
                current={isCurrent(item.href)}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </MobileLink>
            ))}
            {memberLinks.length > 0 && (
              <>
                <div className="my-1 h-px bg-border" />
                {memberLinks.map((item) => (
                  <MobileLink
                    key={item.href}
                    href={item.href}
                    current={isCurrent(item.href)}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </MobileLink>
                ))}
              </>
            )}
            {!user && !loading && (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:hidden">
                <LinkButton href="/login" variant="secondary" size="sm">
                  Sign in
                </LinkButton>
                <LinkButton href="/register" variant="primary" size="sm">
                  Create account
                </LinkButton>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function MenuItem({
  href,
  children,
  onClick,
  current,
}: {
  href: string;
  children: string;
  onClick: () => void;
  current: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'flex min-h-10 items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted',
        current ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  children,
  onClick,
  current,
}: {
  href: string;
  children: string;
  onClick: () => void;
  current: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted',
        current ? 'bg-primary/10 text-primary' : 'text-foreground',
      )}
    >
      {children}
    </Link>
  );
}
