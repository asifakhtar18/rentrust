'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Badge, Button, Card, Spinner } from '@/components/ui';

interface ContentFlag {
  category: string;
  excerpt: string;
}
interface QueueItem {
  id: string;
  propertyId: string;
  status: string;
  createdAt: string;
  openReports: number;
  reportReasons: string[];
  contentFlags: ContentFlag[];
}

const DECISIONS = [
  { key: 'PUBLISH', label: 'Publish', variant: 'primary' as const },
  { key: 'REJECT', label: 'Reject', variant: 'secondary' as const },
  { key: 'HIDE', label: 'Hide', variant: 'secondary' as const },
  { key: 'REMOVE', label: 'Remove', variant: 'danger' as const },
];

export default function ModerationQueue() {
  const { request } = useAuth();
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await request<QueueItem[]>('/moderation/queue?pageSize=50');
      setItems(data);
    } catch {
      setItems([]);
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: string) {
    setActing(id);
    try {
      await request(`/moderation/reviews/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
    } catch {
      // leave in place on failure
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <h1 className="text-title2 font-semibold tracking-tight text-ink">Moderation queue</h1>
      <p className="mt-1 text-footnote text-ink-secondary">
        Reviews awaiting first moderation or with open reports. Negative reviews are never removed
        for being negative.
      </p>

      {items === null ? (
        <div className="mt-8 flex items-center gap-2 text-footnote text-ink-tertiary">
          <Spinner className="text-accent" /> Loading queue…
        </div>
      ) : items.length === 0 ? (
        <Card className="mt-6 p-10 text-center">
          <p className="text-callout font-medium text-ink">Queue is clear</p>
          <p className="mt-1 text-footnote text-ink-secondary">Nothing needs attention right now.</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={item.status === 'UNDER_REVIEW' ? 'caution' : 'neutral'}>
                  {item.status.replace(/_/g, ' ').toLowerCase()}
                </Badge>
                {item.openReports > 0 && (
                  <Badge tone="critical">
                    {item.openReports} {item.openReports === 1 ? 'report' : 'reports'}
                  </Badge>
                )}
                {item.reportReasons.map((r) => (
                  <Badge key={r} tone="caution">
                    {r.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                ))}
                <a
                  href={`/properties/${item.propertyId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-caption text-accent hover:brightness-110"
                >
                  View property ↗
                </a>
              </div>

              {item.contentFlags.length > 0 && (
                <div className="mt-3 rounded-xl bg-caution/8 p-3">
                  <p className="text-caption font-medium text-caution">
                    Heuristic flags — review carefully (triage only, not grounds to remove)
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {item.contentFlags.map((f, i) => (
                      <li key={i} className="text-caption text-ink-secondary">
                        {f.category.replace(/_/g, ' ').toLowerCase()}: “{f.excerpt}”
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {DECISIONS.map((dec) => (
                  <Button
                    key={dec.key}
                    size="sm"
                    variant={dec.variant}
                    loading={acting === item.id}
                    onClick={() => decide(item.id, dec.key)}
                  >
                    {dec.label}
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
