'use client';

import Link from 'next/link';
import { useState } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, Field, Input } from '@/components/ui/primitives';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('Request failed');
      setDone(true);
    } catch {
      setError('We couldn’t reach the reset service. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-0 bg-transparent p-0 shadow-none">
      <p className="eyebrow">We’ll get you back in</p>
      <h1 className="mt-3 t-page-title text-foreground">Reset your password.</h1>
      {done ? (
        <p className="mt-3 t-body text-muted-foreground">
          If an account exists for <span className="text-foreground">{email}</span>, we&apos;ve sent a reset link. Check your inbox.
        </p>
      ) : (
        <>
          <p className="mt-1 t-meta">We&apos;ll email you a link to set a new password.</p>
          <p className="mt-2 t-body text-muted-foreground">Enter the email on your account. We’ll send a private reset link if it’s registered.</p>
          <form onSubmit={onSubmit} className="mt-7 space-y-5">
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </Field>
            {error && <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 t-meta text-destructive">{error}</p>}
            <Button type="submit" loading={loading} size="lg" className="w-full">Send reset link</Button>
          </form>
        </>
      )}
      <p className="mt-5 text-center t-meta">
        <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
      </p>
    </Card>
  );
}
