'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, ImagePlus, MapPin, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { AdminHeader, Panel, TableEmpty, TableError, TableLoading } from '../admin-ui';

interface Contribution {
  id: string;
  kind: 'ADD_PROPERTY' | 'EDIT_PROPERTY' | 'ADD_PHOTO';
  createdAt: string;
  payload: Record<string, unknown>;
  submitter: { displayName: string | null; email: string };
  property: {
    id: string;
    displayName: string;
    locality: { name: string; city: { name: string } } | null;
  } | null;
}
const LABELS = {
  ADD_PROPERTY: 'New property',
  EDIT_PROPERTY: 'Listing correction',
  ADD_PHOTO: 'Photo suggestion',
} as const;

export default function AdminPropertyContributionsPage() {
  const { request } = useAuth();
  const [items, setItems] = useState<Contribution[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await request<Contribution[]>('/properties/contributions/admin/queue'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load property requests.');
    } finally {
      setLoading(false);
    }
  }, [request]);
  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    setBusy(id);
    setError('');
    try {
      await request(`/properties/contributions/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, note: notes[id] || undefined }),
      });
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not review this request.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div>
      <AdminHeader
        title="Property suggestions"
        description="Review resident requests to add a property, correct details, or contribute a photo."
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
            title="No property requests waiting"
            body="New community suggestions will appear here after residents send them."
          />
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => {
              const payload = item.payload ?? {};
              const name =
                typeof payload.displayName === 'string'
                  ? payload.displayName
                  : (item.property?.displayName ?? 'Property request');
              const imageUrl = typeof payload.imageUrl === 'string' ? payload.imageUrl : '';
              const requestMessage = typeof payload.message === 'string' ? payload.message : '';
              const place = item.property?.locality
                ? `${item.property.locality.name}, ${item.property.locality.city.name}`
                : null;
              return (
                <article key={item.id} className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand">{LABELS[item.kind]}</Badge>
                        <h2 className="t-section-title text-foreground">{name}</h2>
                      </div>
                      <p className="mt-1 t-meta text-muted-foreground">
                        From {item.submitter.displayName || item.submitter.email} ·{' '}
                        {new Date(item.createdAt).toLocaleDateString('en-IN')}
                      </p>
                      {place && (
                        <p className="mt-1 inline-flex items-center gap-1 t-meta text-muted-foreground">
                          <MapPin className="size-3.5" aria-hidden />
                          {place}
                        </p>
                      )}
                    </div>
                    {item.property && (
                      <Link
                        href={`/admin/properties/${item.property.id}`}
                        className="inline-flex min-h-10 items-center gap-1.5 t-label text-primary hover:underline"
                      >
                        Open property editor
                        <ExternalLink className="size-3.5" aria-hidden />
                      </Link>
                    )}
                  </div>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    {typeof payload.propertyType === 'string' && (
                      <div>
                        <dt className="t-helper text-muted-foreground">Type</dt>
                        <dd className="t-meta text-foreground">
                          {payload.propertyType.replaceAll('_', ' ')}
                        </dd>
                      </div>
                    )}
                    {typeof payload.cityId === 'string' && (
                      <div>
                        <dt className="t-helper text-muted-foreground">City ID</dt>
                        <dd className="t-meta text-foreground">{payload.cityId}</dd>
                      </div>
                    )}
                    {typeof payload.googleMapsUrl === 'string' && (
                      <div className="sm:col-span-2">
                        <dt className="t-helper text-muted-foreground">Map location</dt>
                        <dd>
                          <a
                            href={payload.googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all t-meta text-primary underline"
                          >
                            Open Google Maps link
                          </a>
                        </dd>
                      </div>
                    )}
                    {imageUrl && (
                      <div className="sm:col-span-2">
                        <dt className="t-helper text-muted-foreground">Suggested photo</dt>
                        <dd>
                          <a
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 break-all t-meta text-primary underline"
                          >
                            <ImagePlus className="size-4" aria-hidden />
                            View photo link
                          </a>
                          <p className="mt-1 t-helper text-muted-foreground">
                            Check the photo and attach it in the property editor before accepting
                            this request.
                          </p>
                        </dd>
                      </div>
                    )}
                  </dl>
                  {requestMessage && (
                    <p className="mt-4 whitespace-pre-wrap rounded-md bg-muted/50 px-3 py-2 t-meta text-foreground">
                      {requestMessage}
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
                      maxLength={1000}
                      rows={2}
                      className="w-full rounded-md border border-input bg-card px-3 py-2 t-body text-foreground"
                    />
                  </label>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      loading={busy === item.id}
                      onClick={() => void decide(item.id, 'APPROVED')}
                    >
                      <Check className="size-4" aria-hidden />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={Boolean(busy)}
                      onClick={() => void decide(item.id, 'REJECTED')}
                    >
                      <X className="size-4" aria-hidden />
                      Reject
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
