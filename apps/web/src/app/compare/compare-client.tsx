'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, Search, Loader2, Building2 } from 'lucide-react';
import { apiFetch, qs } from '@/lib/api';
import type { Property, TrustScore, SearchHit } from '@/lib/types';
import { CATEGORY_LABELS, PROPERTY_TYPE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/cn';
import { Card, EmptyState, Input, Badge } from '@/components/ui/primitives';
import { LinkButton } from '@/components/ui/button';
import { scoreBand } from '@/components/trust-score/trust-score';

interface CompareRow {
  property: Property;
  score: TrustScore;
}

const MAX = 4;
const MIN = 2;

export function CompareClient() {
  const params = useSearchParams();
  const router = useRouter();

  const ids = useMemo(() => {
    const raw = params.get('ids') ?? '';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX);
  }, [params]);

  const [rows, setRows] = useState<CompareRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length < MIN) {
      setRows([]);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    apiFetch<CompareRow[]>(`/compare${qs({ ids: ids.join(',') })}`)
      .then(({ data }) => {
        if (!active) return;
        // Preserve the order given in the URL.
        const byId = new Map(data.map((r) => [r.property.id, r]));
        setRows(ids.map((id) => byId.get(id)).filter((r): r is CompareRow => Boolean(r)));
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load comparison.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ids]);

  const setIds = useCallback(
    (next: string[]) => {
      const clean = [...new Set(next)].slice(0, MAX);
      router.replace(clean.length ? `/compare${qs({ ids: clean.join(',') })}` : '/compare');
    },
    [router],
  );

  const addId = useCallback((id: string) => setIds([...ids, id]), [ids, setIds]);
  const removeId = useCallback((id: string) => setIds(ids.filter((x) => x !== id)), [ids, setIds]);

  // ---- Category keys present across all compared properties ----
  const categoryKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const r of rows) {
      if (r.score?.categoryScores) {
        Object.keys(r.score.categoryScores).forEach((k) => keys.add(k));
      }
    }
    // Stable, human order first, then anything extra.
    const ordered = Object.keys(CATEGORY_LABELS).filter((k) => keys.has(k));
    const extra = [...keys].filter((k) => !ordered.includes(k));
    return [...ordered, ...extra];
  }, [rows]);

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="t-page-title text-foreground">Compare properties</h1>
        <p className="mt-2 t-body text-muted-foreground">
          Line up {MIN}–{MAX} places side by side. Every number comes from verified resident reviews — nothing is
          estimated or filled in.
        </p>
      </header>

      <div className="mt-7">
        <AddPicker currentIds={ids} full={ids.length >= MAX} onAdd={addId} />
      </div>

      <div className="mt-8">
        {ids.length < MIN ? (
          <EmptyState
            title="Add at least two properties"
            body="Search above to pick the places you're deciding between. You can compare up to four."
            action={<LinkButton href="/search" variant="secondary">Browse properties</LinkButton>}
          />
        ) : loading ? (
          <div className="flex items-center gap-2 py-16 t-meta">
            <Loader2 className="size-4 animate-spin text-primary" /> Loading comparison…
          </div>
        ) : error ? (
          <p className="py-16 t-body text-destructive">{error}</p>
        ) : rows.length < MIN ? (
          <EmptyState title="Couldn't find those properties" body="One or more selections are no longer available." />
        ) : (
          <ComparisonTable rows={rows} categoryKeys={categoryKeys} onRemove={removeId} />
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Comparison table                                                          */
/* -------------------------------------------------------------------------- */

function ComparisonTable({
  rows,
  categoryKeys,
  onRemove,
}: {
  rows: CompareRow[];
  categoryKeys: string[];
  onRemove: (id: string) => void;
}) {
  const canRemove = rows.length > MIN;
  // Grid: first column is the row label, then one column per property.
  const gridCols = { gridTemplateColumns: `minmax(140px, 180px) repeat(${rows.length}, minmax(0, 1fr))` };

  return (
    <Card elevated className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Header row — property identity */}
          <div className="grid border-b border-border bg-muted/40" style={gridCols}>
            <div className="px-4 py-4" />
            {rows.map((r) => (
              <div key={r.property.id} className="relative border-l border-border px-4 py-4">
                {canRemove && (
                  <button
                    onClick={() => onRemove(r.property.id)}
                    aria-label={`Remove ${r.property.displayName}`}
                    className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
                <Link href={`/properties/${r.property.id}`} className="block pr-6">
                  <p className="t-label text-foreground hover:text-primary">{r.property.displayName}</p>
                  <p className="mt-0.5 t-meta">{PROPERTY_TYPE_LABELS[r.property.propertyType] ?? r.property.propertyType}</p>
                </Link>
              </div>
            ))}
          </div>

          {/* Overall trust score */}
          <div className="grid border-b border-border" style={gridCols}>
            <div className="px-4 py-5 t-label text-muted-foreground">Trust score</div>
            {rows.map((r) => (
              <div key={r.property.id} className="border-l border-border px-4 py-5">
                <OverallCell score={r.score} />
              </div>
            ))}
          </div>

          {/* Sample size */}
          <div className="grid border-b border-border" style={gridCols}>
            <div className="px-4 py-3.5 t-body text-muted-foreground">Based on</div>
            {rows.map((r) => (
              <div key={r.property.id} className="border-l border-border px-4 py-3.5 t-body text-foreground">
                {r.score?.hasEnoughData
                  ? `${r.score.sampleSize} ${r.score.sampleSize === 1 ? 'review' : 'reviews'}`
                  : '—'}
              </div>
            ))}
          </div>

          {/* Category rows */}
          {categoryKeys.map((key, i) => (
            <div
              key={key}
              className={cn('grid', i < categoryKeys.length - 1 && 'border-b border-border')}
              style={gridCols}
            >
              <div className="px-4 py-3.5 t-body text-muted-foreground">{CATEGORY_LABELS[key] ?? key}</div>
              {rows.map((r) => {
                const cat = r.score?.categoryScores?.[key];
                return (
                  <div key={r.property.id} className="border-l border-border px-4 py-3.5">
                    {cat ? <CategoryCell score={cat.score} /> : <span className="t-body text-muted-foreground">—</span>}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Verdict / link row */}
          <div className="grid border-t border-border bg-muted/30" style={gridCols}>
            <div className="px-4 py-4" />
            {rows.map((r) => (
              <div key={r.property.id} className="border-l border-border px-4 py-4">
                <LinkButton href={`/properties/${r.property.id}`} variant="secondary" size="sm">
                  View details
                </LinkButton>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function OverallCell({ score }: { score: TrustScore }) {
  if (!score?.hasEnoughData || score.overall == null) {
    return (
      <div>
        <span className="t-title3 text-muted-foreground">—</span>
        <p className="mt-0.5 t-helper">Not enough data</p>
      </div>
    );
  }
  const band = scoreBand(score.overall);
  return (
    <div>
      <span className="tabular text-3xl font-semibold tracking-tight text-foreground">{score.overall}</span>
      <p className={cn('mt-0.5 t-label', band.color)}>{band.label}</p>
    </div>
  );
}

function CategoryCell({ score }: { score: number }) {
  const band = scoreBand(score);
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-7 shrink-0 tabular t-label text-foreground">{score}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-muted">
        <div className={cn('h-full rounded-pill', band.bar)} style={{ width: `${Math.max(3, score)}%` }} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Add-property typeahead                                                    */
/* -------------------------------------------------------------------------- */

function AddPicker({
  currentIds,
  full,
  onAdd,
}: {
  currentIds: string[];
  full: boolean;
  onAdd: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    const t = setTimeout(() => {
      apiFetch<SearchHit[]>(`/search${qs({ q, types: 'property', limit: 8 })}`)
        .then(({ data }) => {
          if (id === reqId.current) setHits(data);
        })
        .catch(() => {
          if (id === reqId.current) setHits([]);
        })
        .finally(() => {
          if (id === reqId.current) setLoading(false);
        });
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  if (full) {
    return (
      <p className="t-meta">
        You&apos;ve reached the maximum of {MAX} properties. Remove one to add another.
      </p>
    );
  }

  const available = hits.filter((h) => !currentIds.includes(h.id));

  return (
    <div className="relative max-w-md" ref={boxRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Add a property to compare…"
          className="pl-10"
          aria-label="Search for a property to add to the comparison"
        />
      </div>

      {open && q.trim() && (
        <Card elevated className="absolute z-20 mt-2 w-full overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 t-meta">
              <Loader2 className="size-4 animate-spin text-primary" /> Searching…
            </div>
          ) : available.length === 0 ? (
            <p className="px-4 py-3 t-meta">No new properties match “{q}”.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {available.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => {
                      onAdd(h.id);
                      setQ('');
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate t-label text-foreground">{h.title}</span>
                      {h.subtitle && <span className="block truncate t-meta">{h.subtitle}</span>}
                    </span>
                    <Plus className="size-4 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {currentIds.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <Badge tone="brand">{currentIds.length} selected</Badge>
          {currentIds.length < MAX && <span className="t-helper">Add up to {MAX - currentIds.length} more</span>}
        </div>
      )}
    </div>
  );
}
