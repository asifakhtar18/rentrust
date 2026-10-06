'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { ModerationQueueItem, ModerationDecision } from '@/lib/types';
import { humanizeTag } from '@/lib/labels';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { AdminHeader, Panel, TableLoading, TableError, TableEmpty, Th, Td, ShortId } from '../admin-ui';

const PAGE_SIZE = 20;

/** Primary decisions surfaced inline; the rest live on the detail flow. */
const DECISIONS: { decision: ModerationDecision; label: string; variant: 'primary' | 'secondary' | 'danger' }[] = [
  { decision: 'PUBLISH', label: 'Publish', variant: 'primary' },
  { decision: 'HIDE', label: 'Hide', variant: 'secondary' },
  { decision: 'REJECT', label: 'Reject', variant: 'danger' },
];

export default function ModerationPage() {
  const { request } = useAuth();
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        // Queue returns {data: items, meta:{total,page,pageSize}}; request() unwraps .data,
        // so we receive just the items array and drive pagination with prev/next.
        const data = await request<ModerationQueueItem[]>(`/moderation/queue?page=${p}&pageSize=${PAGE_SIZE}`);
        setItems(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load the moderation queue.');
      } finally {
        setLoading(false);
      }
    },
    [request],
  );

  useEffect(() => {
    void load(page);
  }, [load, page]);

  async function decide(id: string, decision: ModerationDecision) {
    setBusyId(id);
    try {
      await request(`/moderation/reviews/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <AdminHeader
        title="Moderation"
        description="Reviews pending moderation or carrying open reports. Oldest first."
      />

      <Panel>
        {loading ? (
          <TableLoading />
        ) : error ? (
          <TableError message={error} onRetry={() => void load(page)} />
        ) : items.length === 0 ? (
          <TableEmpty title="Queue is clear" body="No reviews need attention right now." />
        ) : (
          <table className="w-full border-collapse">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <Th>Review</Th>
                <Th>Status</Th>
                <Th>Reports</Th>
                <Th>Flags</Th>
                <Th className="text-right">Decision</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <Td>
                    <div className="flex flex-col gap-0.5">
                      <ShortId id={r.id} />
                      <Link
                        href={`/properties/${r.propertyId}`}
                        className="inline-flex items-center gap-1 t-helper text-primary hover:underline"
                      >
                        View property <ExternalLink className="size-3" aria-hidden />
                      </Link>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={r.status === 'PENDING_MODERATION' ? 'warning' : 'neutral'}>
                      {humanizeTag(r.status)}
                    </Badge>
                  </Td>
                  <Td>
                    {r.openReports > 0 ? (
                      <span className="inline-flex items-center gap-1.5 t-label text-destructive">
                        <AlertTriangle className="size-3.5" aria-hidden /> {r.openReports}
                      </span>
                    ) : (
                      <span className="t-helper">—</span>
                    )}
                    {r.reportReasons.length > 0 && (
                      <p className="mt-0.5 t-helper">{r.reportReasons.map(humanizeTag).join(', ')}</p>
                    )}
                  </Td>
                  <Td>
                    {r.contentFlags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.contentFlags.map((f) => (
                          <Badge key={f} tone="danger">
                            {humanizeTag(f)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="t-helper">Clean</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {DECISIONS.map((d) => (
                        <Button
                          key={d.decision}
                          variant={d.variant}
                          size="sm"
                          loading={busyId === r.id}
                          onClick={() => void decide(r.id, d.decision)}
                        >
                          {d.label}
                        </Button>
                      ))}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {/* Pagination — simple prev/next since the queue is bounded by throughput. */}
      {!loading && !error && (items.length === PAGE_SIZE || page > 1) && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="t-meta">Page {page}</span>
          <Button
            variant="secondary"
            size="sm"
            disabled={items.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
