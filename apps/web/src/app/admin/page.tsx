'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  BadgeCheck,
  MessageSquare,
  Building2,
  ShieldAlert,
  FileWarning,
  KeyRound,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { AdminDashboard } from '@/lib/types';
import { cn } from '@/lib/cn';
import { AdminHeader, Panel, TableLoading, TableError } from './admin-ui';

export default function AdminDashboardPage() {
  const { request } = useAuth();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await request<AdminDashboard>('/admin/dashboard'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <AdminHeader title="Dashboard" description="Platform health at a glance. Everything here is live from the API." />

      {loading ? (
        <Panel>
          <TableLoading />
        </Panel>
      ) : error ? (
        <Panel>
          <TableError message={error} onRetry={() => void load()} />
        </Panel>
      ) : data ? (
        <>
          {/* Action-needed row — the numbers a moderator acts on first. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <QueueCard
              href="/admin/moderation"
              icon={<ShieldAlert className="size-4" />}
              label="Pending moderation"
              value={data.pendingModeration}
              urgent={data.pendingModeration > 0}
            />
            <QueueCard
              href="/admin/verifications"
              icon={<BadgeCheck className="size-4" />}
              label="Pending verifications"
              value={data.pendingVerification}
              urgent={data.pendingVerification > 0}
            />
            <QueueCard
              href="/admin/moderation"
              icon={<FileWarning className="size-4" />}
              label="Open reports"
              value={data.openReports}
              urgent={data.openReports > 0}
            />
          </div>

          {/* Scale metrics — context, not action. */}
          <h2 className="mb-3 mt-8 t-section-title text-foreground">Platform</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Users className="size-4" />} label="Users" value={data.users} sub={`${data.verifiedResidents} verified`} />
            <StatCard
              icon={<MessageSquare className="size-4" />}
              label="Reviews"
              value={data.reviews}
              sub={`${data.verifiedReviews} verified`}
            />
            <StatCard
              icon={<Building2 className="size-4" />}
              label="Properties"
              value={data.properties}
              sub={`${data.claimedProperties} claimed`}
            />
            <StatCard icon={<MapPin className="size-4" />} label="Active cities" value={data.activeCities} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function QueueCard({
  href,
  icon,
  label,
  value,
  urgent,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center justify-between rounded-lg border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md',
        urgent ? 'border-warning/40' : 'border-border',
      )}
    >
      <div>
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-md',
            urgent ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground',
          )}
        >
          {icon}
        </span>
        <p className="mt-3 t-meta">{label}</p>
        <p className="tabular text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
      <p className="mt-3 t-meta">{label}</p>
      <p className="tabular text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-0.5 t-helper">{sub}</p>}
    </div>
  );
}
