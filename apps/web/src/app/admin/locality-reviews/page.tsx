'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, MapPin, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { AdminHeader, Panel, TableEmpty, TableError, TableLoading } from '../admin-ui';

interface AreaReview {
  id: string;
  tenure: string;
  overall: number | null;
  createdAt: string;
  locality: { id: string; name: string; city: { name: string; state: { name: string } } };
  author: { displayName: string | null; email: string };
  answer: Record<string, unknown> | null;
}
const LABELS: Record<string, string> = {
  municipalServices: 'Municipal services',
  publicTransport: 'Public transport',
  healthcareAccess: 'Healthcare access',
  foodAndGroceries: 'Food and groceries',
  safety: 'Safety',
  cleanliness: 'Cleanliness',
  neighbourliness: 'Neighbourliness',
};

export default function LocalityReviewsModerationPage() {
  const { request } = useAuth();
  const [items, setItems] = useState<AreaReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await request<AreaReview[]>('/locality-reviews/admin/queue'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load area reviews.');
    } finally {
      setLoading(false);
    }
  }, [request]);
  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: 'PUBLISH' | 'REJECT') {
    setBusy(id);
    setError('');
    try {
      await request(`/locality-reviews/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, note: notes[id] || undefined }),
      });
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not moderate this review.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <AdminHeader
        title="Area reviews"
        description="Review neighbourhood experiences separately from building reviews."
      />
      <Panel>
        {error && (
          <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-3">
            <TableError message={error} onRetry={() => void load()} />
          </div>
        )}
        {loading ? (
          <TableLoading />
        ) : items.length === 0 ? (
          <TableEmpty
            title="No area reviews waiting"
            body="New neighbourhood reviews will appear here before residents can see them."
          />
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <article key={item.id} className="p-5 sm:p-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-primary" aria-hidden />
                      <h2 className="t-section-title text-foreground">{item.locality.name}</h2>
                      <Badge tone="warning">Pending</Badge>
                    </div>
                    <p className="mt-1 pl-6 t-meta">
                      {item.locality.city.name}, {item.locality.city.state.name} ·{' '}
                      {item.author.displayName || item.author.email} ·{' '}
                      {new Date(item.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <Link
                    href={`/localities/${item.locality.id}`}
                    className="inline-flex min-h-10 items-center gap-1.5 t-label text-primary hover:underline"
                  >
                    Open area
                    <ExternalLink className="size-3.5" aria-hidden />
                  </Link>
                </header>
                <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(item.answer ?? {})
                    .filter(
                      ([key, value]) =>
                        key !== 'id' &&
                        key !== 'reviewId' &&
                        key !== 'comments' &&
                        typeof value === 'number',
                    )
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 t-meta"
                      >
                        <dt>{LABELS[key] ?? key}</dt>
                        <dd className="font-semibold text-foreground">{String(value)} / 5</dd>
                      </div>
                    ))}
                </dl>
                {typeof item.answer?.comments === 'string' && (
                  <p className="mt-4 whitespace-pre-wrap t-body text-muted-foreground">
                    {item.answer.comments}
                  </p>
                )}
                <label className="mt-4 block">
                  <span className="mb-1.5 block t-label text-foreground">
                    Moderator note (private)
                  </span>
                  <textarea
                    value={notes[item.id] ?? ''}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                    maxLength={2000}
                    rows={2}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 t-body text-foreground"
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    loading={busy === item.id}
                    onClick={() => void decide(item.id, 'PUBLISH')}
                  >
                    <Check className="size-4" aria-hidden />
                    Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={Boolean(busy)}
                    onClick={() => void decide(item.id, 'REJECT')}
                  >
                    <X className="size-4" aria-hidden />
                    Reject
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
