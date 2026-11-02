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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`${getApiBaseUrl()}/auth/password-reset/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => undefined);
    setLoading(false);
    setDone(true);
  }

  return (
    <Card className="p-7" elevated>
      <h1 className="t-section-title text-foreground">Reset your password</h1>
      {done ? (
        <p className="mt-3 t-body text-muted-foreground">
          If an account exists for <span className="text-foreground">{email}</span>, we&apos;ve sent a reset link. Check your inbox.
        </p>
      ) : (
        <>
          <p className="mt-1 t-meta">We&apos;ll email you a link to set a new password.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
          </form>
        </>
      )}
      <p className="mt-5 text-center t-meta">
        <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
      </p>
    </Card>
  );
}
