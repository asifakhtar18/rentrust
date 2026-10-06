'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface OwnerResponseData {
  reviewId: string;
  body: string;
  label: string;
  respondedAt: string;
}

/* Official owner response — clearly labelled, visually distinct from resident content. */
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
    <div className="mt-4 rounded-lg border border-primary/15 bg-primary/[0.06] p-4">
      <p className="flex items-center gap-1.5 t-meta font-medium text-primary">
        <ShieldCheck className="size-3.5" aria-hidden /> {response.label}
      </p>
      <p className="mt-1 t-callout text-foreground/90">{response.body}</p>
    </div>
  );
}
