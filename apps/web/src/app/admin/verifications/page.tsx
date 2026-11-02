'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { VerificationQueueItem } from '@/lib/types';
import { humanizeTag } from '@/lib/labels';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { AdminHeader, Panel, TableLoading, TableError, TableEmpty, Th, Td, ShortId } from '../admin-ui';
import { RejectDialog } from '../reject-dialog';
import { DocumentAccessButton } from '../document-access-button';

export default function VerificationsPage() {
  const { request } = useAuth();
  const [items, setItems] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await request<VerificationQueueItem[]>('/verifications/admin/queue'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load verifications.');
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
      await request(`/verifications/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'VERIFIED' }),
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
      await request(`/verifications/${id}/decision`, {
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
        title="Verifications"
        description="Resident verification requests awaiting review. Documents are only accessible to staff."
      />

      <Panel>
        {loading ? (
          <TableLoading />
        ) : error ? (
          <TableError message={error} onRetry={() => void load()} />
        ) : items.length === 0 ? (
          <TableEmpty title="Nothing to verify" body="All verification requests have been handled." />
        ) : (
          <table className="w-full border-collapse">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <Th>Request</Th>
                <Th>Evidence</Th>
                <Th>Docs</Th>
                <Th>Linked review</Th>
                <Th className="text-right">Decision</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30">
                  <Td>
                    <div className="flex flex-col gap-0.5">
                      <ShortId id={v.id} />
                      <Link
                        href={`/properties/${v.propertyId}`}
                        className="inline-flex items-center gap-1 t-helper text-primary hover:underline"
                      >
                        View property <ExternalLink className="size-3" aria-hidden />
                      </Link>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone="neutral">{humanizeTag(v.evidenceType)}</Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-col items-start gap-2">
                      {v.documents.map((document) => (
                        <div key={document.id} className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 t-helper text-muted-foreground">
                            <FileText className="size-3.5" aria-hidden /> {Math.ceil(document.sizeBytes / 1024)} KB
                          </span>
                          <DocumentAccessButton documentId={document.id} endpoint="verifications" />
                        </div>
                      ))}
                      {v.documents.length === 0 && <span className="t-helper">No documents</span>}
                    </div>
                  </Td>
                  <Td>{v.reviewId ? <ShortId id={v.reviewId} /> : <span className="t-helper">—</span>}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="primary" size="sm" loading={busyId === v.id} onClick={() => void approve(v.id)}>
                        Verify
                      </Button>
                      <Button variant="danger" size="sm" disabled={busyId === v.id} onClick={() => setRejecting(v.id)}>
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
          title="Reject verification"
          busy={busyId === rejecting}
          onCancel={() => setRejecting(null)}
          onConfirm={(reason) => void reject(rejecting, reason)}
        />
      )}
    </div>
  );
}
