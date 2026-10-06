'use client';

import Link from 'next/link';
import { useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { Button, Card, Field, Input } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Always succeeds client-side — the backend is enumeration-safe.
    await fetch(`${API_BASE_URL}/auth/password-reset/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => undefined);
    setLoading(false);
    setDone(true);
  }

  return (
    <Card className="p-7">
      <h1 className="text-title2 font-semibold tracking-tight text-ink">Reset your password</h1>
      {done ? (
        <p className="mt-3 text-body text-ink-secondary">
          If an account exists for <span className="text-ink">{email}</span>, we&apos;ve sent a reset
          link. Check your inbox.
        </p>
      ) : (
        <>
          <p className="mt-1 text-footnote text-ink-secondary">
            We&apos;ll email you a link to set a new password.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" loading={loading} className="w-full">
              Send reset link
            </Button>
          </form>
        </>
      )}
      <p className="mt-5 text-center text-footnote">
        <Link href="/login" className="text-accent hover:brightness-110">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
