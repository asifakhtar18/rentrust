'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface DocumentAccessButtonProps {
  documentId: string;
  endpoint: 'claims' | 'verifications';
}

export function DocumentAccessButton({ documentId, endpoint }: DocumentAccessButtonProps) {
  const { request } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openDocument() {
    const tab = window.open('about:blank', '_blank');
    if (!tab) {
      setError('Allow pop-ups to open private evidence.');
      return;
    }
    tab.opener = null;
    setLoading(true);
    setError(null);
    try {
      const signed = await request<{ downloadUrl: string }>(
        `/${endpoint}/admin/documents/${encodeURIComponent(documentId)}/download`,
      );
      tab.location.replace(signed.downloadUrl);
    } catch (cause) {
      tab.close();
      setError(cause instanceof Error ? cause.message : 'Could not open document.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Button type="button" variant="secondary" size="sm" loading={loading} onClick={() => void openDocument()}>
        <ExternalLink className="size-3.5" aria-hidden /> Open
      </Button>
      {error && <span role="status" className="max-w-40 t-helper text-destructive">{error}</span>}
    </span>
  );
}
