'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, qs } from '@/lib/api';
import type { Property, SearchHit, TrustScore } from '@/lib/types';
import { CATEGORY_LABELS, PROPERTY_TYPE_LABELS } from '@/lib/labels';
import { Card, Input, Spinner } from '@/components/ui';
import { ScoreRing, scoreBand } from '@/components/score-ring';
import { cn } from '@/lib/cn';

interface Entry {
  property: Property;
  score: TrustScore;
}

export function CompareClient() {
  const params = useSearchParams();
  const router = useRouter();
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (ids.length < 2) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiFetch<Entry[]>(`/compare${qs({ ids: ids.join(',') })}`);
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('ids')]);

  useEffect(() => {
    void load();
  }, [load]);

  const removeId = (id: string) => {
    const next = ids.filter((x) => x !== id);
    router.replace(`/compare${next.length ? `?ids=${next.join(',')}` : ''}`);
  };

  const addId = (id: string) => {
    if (ids.includes(id) || ids.length >= 4) return;
    router.replace(`/compare?ids=${[...ids, id].join(',')}`);
  };

  const categories = Object.keys(CATEGORY_LABELS);

  return (
    <div className="mt-6">
      <PropertyPicker onPick={addId} disabled={ids.length >= 4} chosen={ids} />

      {ids.length < 2 ? (
        <Card className="mt-6 p-10 text-center">
          <p className="text-callout font-medium text-ink">Pick at least two properties</p>
          <p className="mx-auto mt-1 max-w-sm text-footnote text-ink-secondary">
            Search above to add properties to the comparison.
          </p>
        </Card>
      ) : loading ? (
        <div className="mt-6 flex items-center gap-2 text-footnote text-ink-tertiary">
          <Spinner className="text-accent" /> Loading comparison…
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `160px repeat(${entries.length}, minmax(180px, 1fr))` }}
          >
            {/* Header row */}
            <div />
            {entries.map((e) => (
              <Card key={e.property.id} className="p-4 text-center">
                <div className="flex justify-center">
                  {e.score.hasEnoughData && e.score.overall != null ? (
                    <ScoreRing score={e.score.overall} size={92} stroke={9} label={false} />
                  ) : (
                    <div className="flex h-[92px] items-center text-caption text-ink-tertiary">No data</div>
                  )}
                </div>
                <Link
                  href={`/properties/${e.property.id}`}
                  className="mt-2 block truncate text-footnote font-medium text-ink hover:text-accent"
                >
                  {e.property.displayName}
                </Link>
                <p className="truncate text-caption text-ink-tertiary">
                  {PROPERTY_TYPE_LABELS[e.property.propertyType]}
                </p>
                <button
                  onClick={() => removeId(e.property.id)}
                  className="mt-2 text-caption text-ink-tertiary hover:text-critical"
                >
                  Remove
                </button>
              </Card>
            ))}

            {/* Category rows */}
            {categories.map((cat) => (
              <CompareRow key={cat} label={CATEGORY_LABELS[cat]} cat={cat} entries={entries} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, cat, entries }: { label: string; cat: string; entries: Entry[] }) {
  const values = entries.map((e) => e.score.categoryScores?.[cat]?.score ?? null);
  const best = Math.max(...values.map((v) => v ?? -1));
  return (
    <>
      <div className="flex items-center text-footnote text-ink-secondary">{label}</div>
      {entries.map((e, i) => {
        const v = values[i];
        const band = v != null ? scoreBand(v) : null;
        return (
          <div
            key={e.property.id}
            className={cn(
              'flex items-center justify-center rounded-xl py-2.5 text-callout font-medium tabular',
              v != null && v === best && best > 0 ? 'bg-positive/10' : 'bg-canvas',
            )}
            style={band ? { color: `rgb(${band.tone})` } : undefined}
          >
            {v ?? '—'}
          </div>
        );
      })}
    </>
  );
}

function PropertyPicker({
  onPick,
  disabled,
  chosen,
}: {
  onPick: (id: string) => void;
  disabled: boolean;
  chosen: string[];
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      apiFetch<SearchHit[]>(`/search${qs({ q, types: 'property', limit: 6 })}`)
        .then(({ data }) => setHits(data))
        .catch(() => setHits([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={disabled ? 'Up to 4 properties' : 'Add a property to compare'}
        disabled={disabled}
      />
      {hits.length > 0 && (
        <div className="absolute z-10 mt-1.5 w-full rounded-xl bg-surface p-1.5 shadow-raised">
          {hits.map((h) => (
            <button
              key={h.id}
              onClick={() => {
                onPick(h.id);
                setQ('');
                setHits([]);
              }}
              disabled={chosen.includes(h.id)}
              className="block w-full truncate rounded-lg px-3 py-2 text-left text-footnote text-ink-secondary transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-40"
            >
              {h.title}
              {h.subtitle && <span className="text-ink-tertiary"> · {h.subtitle}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
