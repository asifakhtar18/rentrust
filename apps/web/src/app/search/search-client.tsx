'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, MapPin, User, Loader2, ChevronRight, RefreshCw } from 'lucide-react';
import { apiFetch, qs } from '@/lib/api';
import type { SearchHit } from '@/lib/types';
import { PROPERTY_TYPE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/cn';
import { SearchBar } from '@/components/search/search-bar';
import { Card, EmptyState } from '@/components/ui/primitives';
import { Button, LinkButton } from '@/components/ui/button';

type Filter = 'all' | 'property' | 'landlord' | 'locality';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'property', label: 'Properties' },
  { key: 'landlord', label: 'Landlords' },
  { key: 'locality', label: 'Localities' },
];

export function SearchClient() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get('q') ?? '';
  const [filter, setFilter] = useState<Filter>('all');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const run = useCallback(async () => {
    const id = ++reqId.current;
    if (!q.trim()) {
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const types = filter === 'all' ? undefined : filter;
      const { data } = await apiFetch<SearchHit[]>(`/search${qs({ q, types, limit: 30 })}`);
      if (id === reqId.current) setHits(data);
    } catch (cause) {
      if (id === reqId.current) {
        setError(cause instanceof DOMException && cause.name === 'TimeoutError'
          ? 'Search took too long. Check your connection and try again.'
          : 'Couldn’t load these results. Try again in a moment.');
      }
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [q, filter]);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <div>
      <h1 className="t-page-title text-foreground">Search</h1>
      <div className="mt-5">
        <SearchBar initial={q} size="md" autoFocus={!q} />
      </div>

      <div className="mt-5 flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-pill px-3.5 py-1.5 text-[13px] font-medium transition-colors',
              filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {!q.trim() ? (
          <EmptyState
            title="Start typing to search"
            body="Find a property, landlord, PG, or locality. Typos are fine — we'll figure it out."
          />
        ) : loading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 py-10 t-meta">
            <Loader2 className="size-4 animate-spin text-primary" /> Searching…
          </div>
        ) : error ? (
          <div role="alert" className="py-10">
            <p className="t-body text-destructive">{error}</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void run()}><RefreshCw className="size-3.5" aria-hidden /> Retry search</Button>
          </div>
        ) : hits.length === 0 ? (
          <EmptyState
            title={`No matches for “${q}”`}
            body="If the place is missing, you can add it for other renters. We check suggestions before they appear."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {filter !== 'landlord' && (
                  <LinkButton
                    href={`/properties/suggest?name=${encodeURIComponent(q)}`}
                    size="sm"
                  >
                    <Building2 className="size-4" aria-hidden />
                    Suggest this property
                  </LinkButton>
                )}
                {filter !== 'property' && (
                  <LinkButton
                    href={`/locations/suggest?name=${encodeURIComponent(q)}`}
                    variant="secondary"
                    size="sm"
                  >
                    <MapPin className="size-4" aria-hidden />
                    Suggest this area
                  </LinkButton>
                )}
              </div>
            }
          />
        ) : (
          <Card className="divide-y divide-border overflow-hidden" elevated>
            {hits.map((h) => (
              <ResultRow key={`${h.type}:${h.id}`} hit={h} />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

function ResultRow({ hit }: { hit: SearchHit }) {
  const href = hit.type === 'property' ? `/properties/${hit.id}` : hit.type === 'locality' ? `/localities/${hit.id}` : `/landlords/${hit.id}`;
  const typeLabel = hit.type === 'property' ? 'Property' : hit.type === 'locality' ? 'Locality' : 'Landlord';
  const propType = hit.meta?.propertyType as string | undefined;
  const Icon = hit.type === 'property' ? Building2 : hit.type === 'locality' ? MapPin : User;

  return (
    <Link href={href} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/60">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate t-label text-foreground">{hit.title}</p>
        <p className="truncate t-meta">
          {[typeLabel, propType ? PROPERTY_TYPE_LABELS[propType] : null, hit.subtitle].filter(Boolean).join(' · ')}
          {hit.distanceMeters != null && ` · ${(hit.distanceMeters / 1000).toFixed(1)} km`}
        </p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
