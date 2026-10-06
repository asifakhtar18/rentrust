'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, Spinner } from '@/components/ui';

interface Metrics {
  users: number;
  verifiedResidents: number;
  reviews: number;
  verifiedReviews: number;
  properties: number;
  claimedProperties: number;
  pendingModeration: number;
  pendingVerification: number;
  openReports: number;
  activeCities: number;
}

const CARDS: { key: keyof Metrics; label: string; href?: string }[] = [
  { key: 'pendingModeration', label: 'Pending moderation', href: '/admin/moderation' },
  { key: 'pendingVerification', label: 'Pending verification', href: '/admin/verifications' },
  { key: 'openReports', label: 'Open reports', href: '/admin/moderation' },
  { key: 'reviews', label: 'Total reviews' },
  { key: 'verifiedReviews', label: 'Verified reviews' },
  { key: 'properties', label: 'Properties', href: '/admin/properties' },
  { key: 'claimedProperties', label: 'Claimed properties' },
  { key: 'users', label: 'Users', href: '/admin/users' },
  { key: 'verifiedResidents', label: 'Verified residents' },
  { key: 'activeCities', label: 'Active cities' },
];

export default function AdminDashboard() {
  const { request } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    request<Metrics>('/admin/dashboard')
      .then(({ data }) => setMetrics(data))
      .catch(() => setMetrics(null));
  }, [request]);

  return (
    <div>
      <h1 className="text-title2 font-semibold tracking-tight text-ink">Dashboard</h1>
      <p className="mt-1 text-footnote text-ink-secondary">Platform health at a glance.</p>

      {!metrics ? (
        <div className="mt-8 flex items-center gap-2 text-footnote text-ink-tertiary">
          <Spinner className="text-accent" /> Loading metrics…
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CARDS.map((c) => {
            const value = metrics[c.key];
            const highlight = c.key === 'pendingModeration' || c.key === 'pendingVerification' || c.key === 'openReports';
            const body = (
              <Card
                className={`p-5 transition-shadow duration-200 ${c.href ? 'hover:shadow-raised' : ''}`}
              >
                <p className="tabular text-title1 font-semibold text-ink">{value}</p>
                <p className="mt-1 text-caption text-ink-secondary">{c.label}</p>
                {highlight && value > 0 && (
                  <span className="mt-2 inline-block size-2 rounded-full bg-caution" aria-hidden />
                )}
              </Card>
            );
            return c.href ? (
              <Link key={c.key} href={c.href}>
                {body}
              </Link>
            ) : (
              <div key={c.key}>{body}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
