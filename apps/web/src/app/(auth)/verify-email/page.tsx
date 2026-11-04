'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, Field, Input } from '@/components/ui/primitives';

export default function VerifyEmailPage() {
  return (
    <Card className="border-0 bg-transparent p-0 shadow-none">
      <p className="eyebrow">Keep your account secure</p>
      <h1 className="mt-3 t-page-title text-foreground">Email verification.</h1>
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
  const [state, setState] = useState<'pending' | 'ok' | 'error' | 'sent'>('pending');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const verifiedRef = useRef(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hash.get('access_token');
    const tokenHash = params.get('token_hash');
    if (!accessToken && !tokenHash) {
      setState(params.get('sent') === '1' ? 'sent' : 'error');
      return;
    }
    if (verifiedRef.current) return;
    verifiedRef.current = true;
    fetch(`${getApiBaseUrl()}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accessToken
        ? { accessToken }
        : { tokenHash, type: params.get('type') ?? 'signup' }),
    })
      .then((res) => setState(res.ok ? 'ok' : 'error'))
      .catch(() => setState('error'));
  }, [params]);

  async function requestNewLink(event: FormEvent) {
    event.preventDefault();
    setResending(true);
    setResendError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/verify-email/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('Request failed');
      setResent(true);
    } catch {
      setResendError('We couldn’t reach the verification service. Check your connection and try again.');
    } finally {
      setResending(false);
    }
  }

  if (state === 'pending')
    return (
      <p className="flex items-center gap-2 t-body text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" /> Verifying your email…
      </p>
    );
  if (state === 'ok') return <p className="t-body text-success">Your email is verified. Thank you.</p>;
  if (state === 'sent') return (
    <div>
      <p className="t-body text-foreground">Check your inbox for a verification link before signing in.</p>
      {resent ? (
        <p className="mt-4 t-meta text-muted-foreground">If this account needs verification, a new link has been sent.</p>
      ) : (
        <form onSubmit={requestNewLink} className="mt-5 space-y-4">
          <Field label="Account email" htmlFor="verification-email">
            <Input id="verification-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" />
          </Field>
          {resendError && <p role="alert" className="t-meta text-destructive">{resendError}</p>}
          <Button type="submit" loading={resending} size="lg" className="w-full">Resend verification link</Button>
        </form>
      )}
    </div>
  );
  return (
    <div>
      <p className="t-body text-destructive">This verification link is invalid or has expired.</p>
      {resent ? (
        <p className="mt-4 t-meta text-muted-foreground">
          If this account needs verification, a new link has been sent.
        </p>
      ) : (
        <form onSubmit={requestNewLink} className="mt-5 space-y-4">
          <Field label="Account email" htmlFor="verification-email">
            <Input id="verification-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" />
          </Field>
          {resendError && <p role="alert" className="t-meta text-destructive">{resendError}</p>}
          <Button type="submit" loading={resending} size="lg" className="w-full">Send a new verification link</Button>
        </form>
      )}
    </div>
  );
}
