'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { ClaimQueueItem } from '@/lib/types';
import { humanizeTag } from '@/lib/labels';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { AdminHeader, Panel, TableLoading, TableError, TableEmpty, Th, Td, ShortId } from '../admin-ui';
import { RejectDialog } from '../reject-dialog';
import { DocumentAccessButton } from '../document-access-button';

export default function ClaimsPage() {
  const { request } = useAuth();
  const [items, setItems] = useState<ClaimQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await request<ClaimQueueItem[]>('/claims/admin/queue'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load claims.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await request(`/claims/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'APPROVED' }),
      });
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string, rejectionReason: string) {
    setBusyId(id);
    try {
      await request(`/claims/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'REJECTED', rejectionReason }),
      });
      setItems((xs) => xs.filter((x) => x.id !== id));
      setRejecting(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <AdminHeader
        title="Property claims"
        description="Owners and managers requesting control of a property. Approving grants the matching role."
      />

      <Panel>
        {loading ? (
          <TableLoading />
        ) : error ? (
          <TableError message={error} onRetry={() => void load()} />
        ) : items.length === 0 ? (
          <TableEmpty title="No pending claims" body="Ownership claims will appear here for review." />
        ) : (
          <table className="w-full border-collapse">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <Th>Claim</Th>
                <Th>Role</Th>
                <Th>Docs</Th>
                <Th>Claimant</Th>
                <Th className="text-right">Decision</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <Td>
                    <div className="flex flex-col gap-0.5">
                      <ShortId id={c.id} />
                      <Link
                        href={`/properties/${c.propertyId}`}
                        className="inline-flex items-center gap-1 t-helper text-primary hover:underline"
                      >
                        View property <ExternalLink className="size-3" aria-hidden />
                      </Link>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone="brand">{humanizeTag(c.role)}</Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-col items-start gap-2">
                      {c.documents.map((document) => (
                        <div key={document.id} className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 t-helper text-muted-foreground">
                            <FileText className="size-3.5" aria-hidden /> {Math.ceil(document.sizeBytes / 1024)} KB
                          </span>
                          <DocumentAccessButton documentId={document.id} endpoint="claims" />
                        </div>
                      ))}
                      {c.documents.length === 0 && <span className="t-helper">No documents</span>}
                    </div>
                  </Td>
                  <Td>
                    <ShortId id={c.claimantId} />
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="primary" size="sm" loading={busyId === c.id} onClick={() => void approve(c.id)}>
                        Approve
                      </Button>
                      <Button variant="danger" size="sm" disabled={busyId === c.id} onClick={() => setRejecting(c.id)}>
                        Reject
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {rejecting && (
        <RejectDialog
          title="Reject claim"
          busy={busyId === rejecting}
          onCancel={() => setRejecting(null)}
          onConfirm={(reason) => void reject(rejecting, reason)}
        />
      )}
    </div>
  );
}
