'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { Card, Spinner } from '@/components/ui';

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

  if (state === 'pending') {
    return (
      <p className="flex items-center gap-2 text-body text-ink-secondary">
        <Spinner className="text-accent" /> Verifying your email…
      </p>
    );
  }
  if (state === 'ok') {
    return <p className="text-body text-positive">Your email is verified. Thank you.</p>;
  }
  return (
    <p className="text-body text-critical">
      This verification link is invalid or has expired.
    </p>
  );
}

export default function VerifyEmailPage() {
  return (
    <Card className="p-7">
      <h1 className="text-title2 font-semibold tracking-tight text-ink">Email verification</h1>
      <div className="mt-4">
        <Suspense fallback={<p className="text-footnote text-ink-tertiary">Loading…</p>}>
          <VerifyInner />
        </Suspense>
      </div>
      <p className="mt-5 text-center text-footnote">
        <Link href="/" className="text-accent hover:brightness-110">
          Go to home
        </Link>
      </p>
    </Card>
  );
}
