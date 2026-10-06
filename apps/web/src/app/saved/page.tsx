'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { Property, TrustScore } from '@/lib/types';
import { PROPERTY_TYPE_LABELS } from '@/lib/labels';
import { Card, LinkButton, Spinner } from '@/components/ui';
import { ScoreRing } from '@/components/score-ring';

interface SavedItem extends Property {
  score: TrustScore;
  savedAt: string;
}

export default function SavedPage() {
  const { request, loading: authLoading, user } = useAuth();
  const [items, setItems] = useState<SavedItem[] | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    request<SavedItem[]>('/me/saved')
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]));
  }, [request, authLoading, user]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-title1 font-semibold tracking-tight text-ink">Saved properties</h1>
      <p className="mt-1 text-callout text-ink-secondary">The places you&apos;re considering.</p>

      {items === null ? (
        <div className="mt-8 flex items-center gap-2 text-footnote text-ink-tertiary">
          <Spinner className="text-accent" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <Card className="mt-8 p-10 text-center">
          <p className="text-callout font-medium text-ink">Nothing saved yet</p>
          <p className="mx-auto mt-1 max-w-sm text-footnote text-ink-secondary">
            Save properties while you research to compare them later.
          </p>
          <LinkButton href="/search" variant="primary" size="sm" className="mt-4">
            Start searching
          </LinkButton>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="group flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-card transition-all duration-200 ease-out hover:shadow-raised"
            >
              {p.score.hasEnoughData && p.score.overall != null ? (
                <ScoreRing score={p.score.overall} size={64} stroke={7} label={false} />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-ink/5 text-caption text-ink-tertiary">
                  New
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-callout font-medium text-ink">{p.displayName}</p>
                <p className="truncate text-footnote text-ink-tertiary">
                  {PROPERTY_TYPE_LABELS[p.propertyType]}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
