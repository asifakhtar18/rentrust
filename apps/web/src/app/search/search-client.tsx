'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, qs } from '@/lib/api';
import type { SearchHit } from '@/lib/types';
import { PROPERTY_TYPE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/cn';
import { SearchBar } from '@/components/search-bar';
import { Spinner } from '@/components/ui';

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
  const [error, setError] = useState(false);
  const reqId = useRef(0);

  const run = useCallback(async () => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError(false);
    try {
      const types = filter === 'all' ? undefined : filter;
      const { data } = await apiFetch<SearchHit[]>(`/search${qs({ q, types, limit: 30 })}`);
      if (id === reqId.current) setHits(data);
    } catch {
      if (id === reqId.current) setError(true);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [q, filter]);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <div>
      <h1 className="mb-4 text-title1 font-semibold tracking-tight text-ink">Search</h1>
      <SearchBar initial={q} size="md" autoFocus={!q} />

      <div className="mt-5 flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-footnote transition-colors',
              filter === f.key ? 'bg-ink text-canvas' : 'bg-ink/5 text-ink-secondary hover:bg-ink/10',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {!q.trim() ? (
          <EmptyHint />
        ) : loading ? (
          <div className="flex items-center gap-2 py-10 text-footnote text-ink-tertiary">
            <Spinner className="text-accent" /> Searching…
          </div>
        ) : error ? (
          <p className="py-10 text-footnote text-critical">Couldn&apos;t load results. Try again.</p>
        ) : hits.length === 0 ? (
          <NoResults q={q} onBrowse={() => router.push('/search')} />
        ) : (
          <ul className="space-y-2.5">
            {hits.map((h) => (
              <li key={`${h.type}:${h.id}`}>
                <ResultCard hit={h} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ResultCard({ hit }: { hit: SearchHit }) {
  const href =
    hit.type === 'property'
      ? `/properties/${hit.id}`
      : hit.type === 'locality'
        ? `/localities/${hit.id}`
        : `/landlords/${hit.id}`;

  const typeLabel = hit.type === 'property' ? 'Property' : hit.type === 'locality' ? 'Locality' : 'Landlord';
  const propType = hit.meta?.propertyType as string | undefined;

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-card transition-all duration-200 ease-out hover:shadow-raised"
    >
      <TypeGlyph type={hit.type} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-callout font-medium text-ink">{hit.title}</p>
        <p className="truncate text-footnote text-ink-tertiary">
          {[typeLabel, propType ? PROPERTY_TYPE_LABELS[propType] : null, hit.subtitle]
            .filter(Boolean)
            .join(' · ')}
          {hit.distanceMeters != null && ` · ${(hit.distanceMeters / 1000).toFixed(1)} km`}
        </p>
      </div>
      <span className="text-ink-tertiary transition-transform duration-200 group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

function TypeGlyph({ type }: { type: SearchHit['type'] }) {
  const paths: Record<SearchHit['type'], string> = {
    property: 'M12 3.2 4.5 8.4v9.1h4.2v-5.3h6.6v5.3h4.2V8.4L12 3.2Z',
    locality: 'M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z',
    landlord: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-7 2-7 5v1h14v-1c0-3-3-5-7-5Z',
  };
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d={paths[type]} />
      </svg>
    </span>
  );
}

function EmptyHint() {
  return (
    <div className="rounded-2xl bg-surface p-10 text-center shadow-card">
      <p className="text-callout font-medium text-ink">Start typing to search</p>
      <p className="mx-auto mt-1 max-w-sm text-footnote text-ink-secondary">
        Find a property, landlord, PG, or locality. Typos are okay — we&apos;ll figure it out.
      </p>
    </div>
  );
}

function NoResults({ q, onBrowse }: { q: string; onBrowse: () => void }) {
  return (
    <div className="rounded-2xl bg-surface p-10 text-center shadow-card">
      <p className="text-callout font-medium text-ink">No matches for “{q}”</p>
      <p className="mx-auto mt-1 max-w-sm text-footnote text-ink-secondary">
        Try a different spelling or a nearby locality.
      </p>
      <button onClick={onBrowse} className="mt-4 text-footnote text-accent hover:brightness-110">
        Clear search
      </button>
    </div>
  );
}
