'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui';

const NAV: { href: string; label: string }[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/moderation', label: 'Moderation' },
  { href: '/admin/verifications', label: 'Verifications' },
  { href: '/admin/claims', label: 'Claims' },
  { href: '/admin/properties', label: 'Properties' },
  { href: '/admin/users', label: 'Users' },
];

/**
 * Admin shell — a dense Operate surface. Client-side role gate complements the
 * middleware (which only checks session presence); the API enforces the real
 * ADMIN/MODERATOR authorization on every call.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = user?.roles.some((r) => r === 'ADMIN' || r === 'MODERATOR');

  useEffect(() => {
    if (!loading && !allowed) router.replace('/');
  }, [loading, allowed, router]);

  if (loading || !allowed) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Spinner className="text-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-5 py-8">
      <aside className="hidden w-48 shrink-0 md:block">
        <p className="px-3 text-caption font-medium uppercase tracking-wide text-ink-tertiary">
          Console
        </p>
        <nav className="mt-2 space-y-0.5">
          {NAV.map((n) => {
            const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'block rounded-xl px-3 py-2 text-footnote transition-colors',
                  active ? 'bg-ink/8 font-medium text-ink' : 'text-ink-secondary hover:bg-ink/5 hover:text-ink',
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
