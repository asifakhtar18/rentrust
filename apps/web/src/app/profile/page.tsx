'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { PublicReview } from '@/lib/types';
import { PROPERTY_TYPE_LABELS } from '@/lib/labels';
import { Badge, Button, Card, Spinner } from '@/components/ui';

interface MyReview extends PublicReview {
  status: string;
}

const STATUS_TONE: Record<string, 'neutral' | 'accent' | 'positive' | 'caution' | 'critical'> = {
  DRAFT: 'neutral',
  PENDING_MODERATION: 'caution',
  UNDER_REVIEW: 'caution',
  PUBLISHED: 'positive',
  REJECTED: 'critical',
  HIDDEN: 'neutral',
  REMOVED: 'critical',
};

export default function ProfilePage() {
  const { user, loading, logout, request } = useAuth();
  const [reviews, setReviews] = useState<MyReview[] | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    request<MyReview[]>('/me/reviews')
      .then(({ data }) => setReviews(data))
      .catch(() => setReviews([]));
  }, [request, loading, user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Spinner className="text-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-title1 font-semibold tracking-tight text-ink">Profile</h1>

      <Card className="mt-6 p-6">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent/10 text-title3 font-semibold text-accent">
            {(user?.displayName ?? user?.email ?? '?').slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="text-callout font-medium text-ink">{user?.displayName ?? 'Resident'}</p>
            <p className="text-footnote text-ink-tertiary">{user?.email}</p>
            <div className="mt-1.5 flex gap-1.5">
              {user?.emailVerified ? (
                <Badge tone="positive">Email verified</Badge>
              ) : (
                <Badge tone="caution">Email not verified</Badge>
              )}
              {user?.roles
                .filter((r) => r !== 'USER')
                .map((r) => (
                  <Badge key={r} tone="accent">
                    {r}
                  </Badge>
                ))}
            </div>
          </div>
          <Button variant="secondary" size="sm" className="ml-auto" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </Card>

      <h2 className="mb-3 mt-8 text-title3 font-semibold tracking-tight text-ink">Your reviews</h2>
      {reviews === null ? (
        <Spinner className="text-accent" />
      ) : reviews.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-footnote text-ink-secondary">You haven&apos;t written any reviews yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/properties/${r.propertyId}`} className="text-footnote font-medium text-ink hover:text-accent">
                  Review · {new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </Link>
                <p className="text-caption text-ink-tertiary">
                  {r.overall != null ? `Overall ${r.overall}/100` : 'Awaiting score'}
                </p>
              </div>
              <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status.replace(/_/g, ' ').toLowerCase()}</Badge>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8 p-6">
        <h2 className="text-title3 font-semibold tracking-tight text-ink">Privacy & data</h2>
        <p className="mt-2 text-footnote text-ink-secondary">
          Your reviews are always anonymous in public. You can request a copy of your data or delete
          your account at any time.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm">Export my data</Button>
          <Button variant="ghost" size="sm" className="text-critical">Delete account</Button>
        </div>
      </Card>
    </div>
  );
}
