'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, MapPin, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { AdminHeader, Panel, TableEmpty, TableLoading } from '../admin-ui';

interface Suggestion { id: string; cityId: string; name: string; description: string | null; latitude: number | null; longitude: number | null; googleMapsUrl: string | null; createdAt: string; city: { name: string; state: { name: string } }; submitter: { displayName: string | null } }
interface Queue { items: Suggestion[]; total: number; page: number; pageSize: number }

export default function LocalitySuggestionsPage() {
  const { request } = useAuth();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setQueue(await request<Queue>(`/locality-suggestions/admin/queue?page=${page}&pageSize=20`)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load suggestions.'); }
    finally { setLoading(false); }
  }, [page, request]);
  useEffect(() => { void load(); }, [load]);

  async function review(item: Suggestion, decision: 'APPROVED' | 'REJECTED') {
    setAction(item.id); setError('');
    try { await request(`/locality-suggestions/${item.id}/review`, { method: 'POST', body: JSON.stringify({ decision }) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update this suggestion.'); }
    finally { setAction(null); }
  }

  return <div>
    <AdminHeader title="Locality suggestions" description="Residents help map the neighbourhoods they know. Check each pin and name before adding it to the directory." actions={<Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className="size-4" aria-hidden />Refresh</Button>} />
    {error && <p role="alert" className="mb-4 rounded-md bg-destructive/10 px-4 py-3 t-meta text-destructive">{error}</p>}
    <Panel>
      {loading ? <TableLoading /> : !queue?.items.length ? <TableEmpty title="The queue is clear" body="New neighbourhood suggestions will appear here." /> : <div className="divide-y divide-border">{queue.items.map((item) => <article key={item.id} className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><MapPin className="size-4 text-primary" aria-hidden /><h2 className="t-section-title text-foreground">{item.name}</h2></div><p className="mt-1 pl-6 t-meta">{item.city.name}, {item.city.state.name} · suggested by {item.submitter.displayName || 'a resident'} · {new Date(item.createdAt).toLocaleDateString('en-IN')}</p></div><div className="flex gap-2"><Button size="sm" onClick={() => void review(item, 'APPROVED')} loading={action === item.id}><Check className="size-4" aria-hidden />Approve</Button><Button variant="secondary" size="sm" onClick={() => void review(item, 'REJECTED')} disabled={action === item.id}><X className="size-4" aria-hidden />Reject</Button></div></div>
        {item.description && <p className="mt-4 max-w-3xl t-body text-muted-foreground">{item.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">{item.latitude !== null && item.longitude !== null && <span>Pin: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</span>}{item.googleMapsUrl && <a className="inline-flex items-center gap-1 text-primary hover:underline" href={item.googleMapsUrl} target="_blank" rel="noreferrer">Open Maps<ExternalLink className="size-3" aria-hidden /></a>}</div></article>)}</div>}
    </Panel>
    {queue && queue.total > queue.pageSize && <div className="mt-4 flex items-center justify-end gap-3"><Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button><span className="t-meta">Page {page} · {queue.total} pending</span><Button variant="secondary" size="sm" disabled={page * queue.pageSize >= queue.total} onClick={() => setPage((p) => p + 1)}>Next</Button></div>}
  </div>;
}
