'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Button, Card, Field, Input } from '@/components/ui';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, displayName || undefined);
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-7">
      <h1 className="text-title2 font-semibold tracking-tight text-ink">Create your account</h1>
      <p className="mt-1 text-footnote text-ink-secondary">
        Reviews are always anonymous in public — your identity stays private.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Name" htmlFor="name" hint="Shown only to you; never on public reviews.">
          <Input
            id="name"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Optional"
          />
        </Field>
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
        <Field label="Password" htmlFor="password" hint="At least 10 characters, with upper, lower, and a number.">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
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
          Create account
        </Button>
      </form>

      <p className="mt-5 text-center text-footnote text-ink-secondary">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:brightness-110">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
