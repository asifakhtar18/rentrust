'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Button, Card, Field, Input } from '@/components/ui';

export default function LoginPage() {
  return (
    <Suspense fallback={<Card className="p-7 text-footnote text-ink-tertiary">Loading…</Card>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-7">
      <h1 className="text-title2 font-semibold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1 text-footnote text-ink-secondary">Sign in to review, save, and compare.</p>

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
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-xl bg-critical/10 px-3 py-2 text-footnote text-critical">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between text-footnote">
        <Link href="/forgot-password" className="text-accent hover:brightness-110">
          Forgot password?
        </Link>
        <Link href="/register" className="text-ink-secondary hover:text-ink">
          Create account
        </Link>
      </div>
    </Card>
  );
}
