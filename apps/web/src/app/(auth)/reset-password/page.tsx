'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, Field, Input } from '@/components/ui/primitives';
import { PasswordField } from '@/components/auth/password-field';

export default function ResetPasswordPage() {
  return (
    <Card className="border-0 bg-transparent p-0 shadow-none">
      <p className="eyebrow">One last step</p>
      <h1 className="mt-3 t-page-title text-foreground">Choose a new password.</h1>
      <Suspense fallback={<p className="mt-4 t-meta">Loading…</p>}>
        <ResetForm />
      </Suspense>
      <p className="mt-5 text-center t-meta">
        <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
      </p>
    </Card>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [accessToken, setAccessToken] = useState(params.get('access_token') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    setAccessToken(hash.get('access_token') ?? params.get('access_token') ?? '');
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, password }),
      });
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push('/login'), 1500);
      } else {
        const body = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(body?.error?.message ?? 'This reset link is invalid or expired.');
      }
    } catch {
      setError('Could not reach the service. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!accessToken) return <p className="mt-4 t-body text-muted-foreground">This reset link is missing its session. Request a new reset link and open it in this browser.</p>;
  if (done) return <p className="mt-4 t-body text-success">Password updated. Redirecting to sign in…</p>;

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field label="New password" htmlFor="password" hint="At least 10 characters, with upper, lower, and a number.">
        <PasswordField id="password" autoComplete="new-password" value={password} onChange={setPassword} />
      </Field>
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 t-meta text-destructive">{error}</p>
      )}
      <Button type="submit" loading={loading} size="lg" className="w-full">Set new password</Button>
    </form>
  );
}
