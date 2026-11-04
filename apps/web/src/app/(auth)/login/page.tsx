'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, Field, Input } from '@/components/ui/primitives';
import { PasswordField } from '@/components/auth/password-field';

export default function LoginPage() {
  return (
    <Suspense fallback={<Card className="border-0 bg-transparent p-0 shadow-none"><p className="t-meta">Preparing your sign-in…</p></Card>}>
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
    <Card className="border-0 bg-transparent p-0 shadow-none">
      <p className="eyebrow">Good to see you</p>
      <h1 className="mt-3 t-page-title text-foreground">Welcome back.</h1>
      <p className="mt-2 t-body text-muted-foreground">Save places and share your experience.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordField id="password" autoComplete="current-password" value={password} onChange={setPassword} />
        </Field>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 t-meta text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">Sign in</Button>
      </form>

      <div className="mt-5 flex items-center justify-between t-meta">
        <Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        <Link href="/register" className="hover:text-foreground">Create account</Link>
      </div>
    </Card>
  );
}
