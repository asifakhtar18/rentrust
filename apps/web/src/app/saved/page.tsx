'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Loader2, X, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { SavedProperty } from '@/lib/types';
import { PROPERTY_TYPE_LABELS } from '@/lib/labels';
import { Section, Card, EmptyState } from '@/components/ui/primitives';
import { LinkButton, Button } from '@/components/ui/button';
import { ScorePill } from '@/components/trust-score/trust-score';

export default function SavedPage() {
  const { user, loading: authLoading, request } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Once auth settles, bounce anonymous visitors to login.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/saved');
    }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request<SavedProperty[]>('/me/saved');
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your saved properties.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function remove(id: string) {
    const prev = items;
    setItems((xs) => xs.filter((x) => x.id !== id));
    try {
      await request(`/properties/${id}/save`, { method: 'DELETE' });
    } catch {
      setItems(prev); // restore on failure
    }
  }

  if (authLoading || (!user && !error)) {
    return (
      <Section className="py-20">
        <div className="flex items-center gap-2 t-meta">
          <Loader2 className="size-4 animate-spin text-primary" /> Loading…
        </div>
      </Section>
    );
  }

  return (
    <Section className="py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="t-page-title text-foreground">Saved properties</h1>
          <p className="mt-2 t-body text-muted-foreground">
            Places you&apos;re keeping an eye on. Trust scores update as new reviews come in.
          </p>
        </div>
        {items.length >= 2 && (
          <LinkButton href={`/compare?ids=${items.slice(0, 4).map((i) => i.id).join(',')}`} variant="secondary" size="sm">
            Compare top {Math.min(items.length, 4)}
          </LinkButton>
        )}
      </header>

      <div className="mt-8">
        {loading ? (
          <div className="flex items-center gap-2 py-16 t-meta">
            <Loader2 className="size-4 animate-spin text-primary" /> Loading your list…
          </div>
        ) : error ? (
          <div className="py-10">
            <p className="t-body text-destructive">{error}</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Nothing saved yet"
            body="Tap Save on any property to pin it here for quick comparison later."
            action={<LinkButton href="/search" variant="primary">Find a property</LinkButton>}
          />
        ) : (
          <Card elevated className="divide-y divide-border overflow-hidden">
            {items.map((p) => (
              <SavedRow key={p.id} property={p} onRemove={() => void remove(p.id)} />
            ))}
          </Card>
        )}
      </div>
    </Section>
  );
}

function SavedRow({ property, onRemove }: { property: SavedProperty; onRemove: () => void }) {
  const hasScore = property.score?.hasEnoughData && property.score.overall != null;
  return (
    <div className="group flex items-center gap-4 px-4 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Bookmark className="size-5" aria-hidden />
      </span>
      <Link href={`/properties/${property.id}`} className="min-w-0 flex-1">
        <p className="truncate t-label text-foreground group-hover:text-primary">{property.displayName}</p>
        <p className="truncate t-meta">
          {PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType}
          {property.developer ? ` · ${property.developer}` : ''}
        </p>
      </Link>
      {hasScore ? (
        <ScorePill score={property.score.overall as number} />
      ) : (
        <span className="t-helper">Not enough data</span>
      )}
      <Link
        href={`/properties/${property.id}`}
        aria-label={`View ${property.displayName}`}
        className="hidden text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
      >
        <ChevronRight className="size-4" aria-hidden />
      </Link>
      <button
        onClick={onRemove}
        aria-label={`Remove ${property.displayName} from saved`}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
