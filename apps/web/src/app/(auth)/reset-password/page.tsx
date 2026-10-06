'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, Field, Input } from '@/components/ui/primitives';

export default function ResetPasswordPage() {
  return (
    <Card className="p-7" elevated>
      <h1 className="t-section-title text-foreground">Choose a new password</h1>
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
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`${API_BASE_URL}/auth/password-reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } else {
      const body = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
      setError(body?.error?.message ?? 'This reset link is invalid or expired.');
    }
  }

  if (!token) return <p className="mt-4 t-body text-muted-foreground">This reset link is missing its token.</p>;
  if (done) return <p className="mt-4 t-body text-success">Password updated. Redirecting to sign in…</p>;

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field label="New password" htmlFor="password" hint="At least 10 characters, with upper, lower, and a number.">
        <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 t-meta text-destructive">{error}</p>
      )}
      <Button type="submit" loading={loading} className="w-full">Set new password</Button>
    </form>
  );
}
