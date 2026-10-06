'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface OwnerResponseData {
  reviewId: string;
  body: string;
  label: string;
  respondedAt: string;
}

/**
 * Fetches and renders the official owner response for a review, clearly
 * labelled and visually distinct from resident content. Rendered inline under
 * each review; absent when there is no response.
 */
export function OwnerResponse({ reviewId }: { reviewId: string }) {
  const [response, setResponse] = useState<OwnerResponseData | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<OwnerResponseData | null>(`/reviews/${reviewId}/owner-response`)
      .then(({ data }) => active && setResponse(data))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [reviewId]);

  if (!response) return null;

  return (
    <div className="mt-4 rounded-xl border-l-2 border-accent/40 bg-accent/5 p-3">
      <p className="text-caption font-medium text-accent">{response.label}</p>
      <p className="mt-1 text-footnote text-ink-secondary">{response.body}</p>
    </div>
  );
}
