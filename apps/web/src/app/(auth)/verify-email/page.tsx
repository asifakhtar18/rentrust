'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { Card } from '@/components/ui/primitives';

export default function VerifyEmailPage() {
  return (
    <Card className="p-7" elevated>
      <h1 className="t-section-title text-foreground">Email verification</h1>
      <div className="mt-4">
        <Suspense fallback={<p className="t-meta">Loading…</p>}>
          <VerifyInner />
        </Suspense>
      </div>
      <p className="mt-5 text-center t-meta">
        <Link href="/" className="text-primary hover:underline">Go to home</Link>
      </p>
    </Card>
  );
}

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'pending' | 'ok' | 'error'>('pending');

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }
    fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => setState(res.ok ? 'ok' : 'error'))
      .catch(() => setState('error'));
  }, [token]);

  if (state === 'pending')
    return (
      <p className="flex items-center gap-2 t-body text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" /> Verifying your email…
      </p>
    );
  if (state === 'ok') return <p className="t-body text-success">Your email is verified. Thank you.</p>;
  return <p className="t-body text-destructive">This verification link is invalid or has expired.</p>;
}
