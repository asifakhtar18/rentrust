'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Badge, Button, Card, Spinner } from '@/components/ui';

interface Doc {
  id: string;
  contentType: string;
  sizeBytes: number;
}
interface ClaimItem {
  id: string;
  propertyId: string;
  role: string;
  status: string;
  createdAt: string;
  documents: Doc[];
}

export default function ClaimsQueue() {
  const { request } = useAuth();
  const [items, setItems] = useState<ClaimItem[] | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await request<ClaimItem[]>('/claims/admin/queue');
      setItems(data);
    } catch {
      setItems([]);
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  async function viewDoc(documentId: string) {
    try {
      const { data } = await request<{ downloadUrl: string }>(
        `/claims/admin/documents/${documentId}/download`,
      );
      window.open(data.downloadUrl, '_blank', 'noreferrer');
    } catch {
      /* ignore */
    }
  }

  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    setActing(id);
    try {
      await request(`/claims/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <h1 className="text-title2 font-semibold tracking-tight text-ink">Property claims</h1>
      <p className="mt-1 text-footnote text-ink-secondary">
        Approving grants the claimant the owner/manager role and marks the property claimed.
      </p>

      {items === null ? (
        <div className="mt-8 flex items-center gap-2 text-footnote text-ink-tertiary">
          <Spinner className="text-accent" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <Card className="mt-6 p-10 text-center">
          <p className="text-callout font-medium text-ink">No pending claims</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{item.role.toLowerCase()}</Badge>
                <a
                  href={`/properties/${item.propertyId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-caption text-accent hover:brightness-110"
                >
                  View property ↗
                </a>
                <span className="ml-auto text-caption text-ink-tertiary">
                  {new Date(item.createdAt).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.documents.map((doc, i) => (
                  <Button key={doc.id} size="sm" variant="secondary" onClick={() => viewDoc(doc.id)}>
                    Document {i + 1}
                  </Button>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="primary" loading={acting === item.id} onClick={() => decide(item.id, 'APPROVED')}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" loading={acting === item.id} onClick={() => decide(item.id, 'REJECTED')}>
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
