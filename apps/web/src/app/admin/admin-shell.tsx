'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  BadgeCheck,
  KeyRound,
  Users,
  Building2,
  MapPin,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/lib/types';
import { cn } from '@/lib/cn';

const STAFF_ROLES: UserRole[] = ['ADMIN', 'MODERATOR'];

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Roles allowed to see this item. Defaults to all staff. */
  roles?: UserRole[];
}

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
  { href: '/admin/moderation', label: 'Moderation', icon: <ShieldAlert className="size-4" /> },
  { href: '/admin/verifications', label: 'Verifications', icon: <BadgeCheck className="size-4" /> },
  { href: '/admin/claims', label: 'Claims', icon: <KeyRound className="size-4" />, roles: ['ADMIN'] },
  { href: '/admin/users', label: 'Users', icon: <Users className="size-4" />, roles: ['ADMIN'] },
  { href: '/admin/properties', label: 'Properties', icon: <Building2 className="size-4" />, roles: ['ADMIN'] },
  { href: '/admin/locations', label: 'Locations', icon: <MapPin className="size-4" />, roles: ['ADMIN'] },
];

function hasStaffAccess(roles: UserRole[] | undefined): boolean {
  return (roles ?? []).some((r) => STAFF_ROLES.includes(r));
}

/**
 * Admin shell: role gate + persistent sidebar. This is the calm, dense
 * "Operate" surface — tighter spacing and a muted canvas distinct from the
 * public pages, but still the same Apple token system.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = hasStaffAccess(user?.roles);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?next=/admin');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="flex items-center gap-2 t-meta">
          <Loader2 className="size-4 animate-spin text-primary" /> Checking access…
        </span>
      </div>
    );
  }

  if (!user || !allowed) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <ShieldAlert className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 t-section-title text-foreground">Staff access only</h1>
        <p className="mx-auto mt-2 max-w-sm t-body text-muted-foreground">
          This area is limited to moderators and administrators. If you believe you should have access, contact your
          admin.
        </p>
        <Link href="/" className="mt-6 inline-flex items-center gap-1.5 t-label text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Back to RenTrust
        </Link>
      </div>
    );
  }

  const isAdmin = (user.roles ?? []).includes('ADMIN');
  const visibleNav = NAV.filter((n) => !n.roles || n.roles.includes('MODERATOR') || isAdmin);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1400px] gap-0">
      {/* Sidebar */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 border-r border-border px-3 py-6 md:block">
        <p className="px-3 eyebrow">Operate</p>
        <nav className="mt-3 space-y-0.5">
          {visibleNav.map((item) => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 t-label transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="w-full">
        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2 md:hidden">
          {visibleNav.map((item) => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <main className="px-5 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
