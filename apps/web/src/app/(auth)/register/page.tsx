'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, Field, Input } from '@/components/ui/primitives';
import { PasswordField } from '@/components/auth/password-field';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const verificationRequired = await register(email, password, displayName || undefined);
      router.push(verificationRequired ? '/verify-email?sent=1' : '/');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-0 bg-transparent p-0 shadow-none">
      <p className="eyebrow">A better way to choose</p>
      <h1 className="mt-3 t-page-title text-foreground">Join the neighbourhood.</h1>
      <p className="mt-2 t-body text-muted-foreground">Create an account to save places and add your own resident experience.</p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <Field label="Name" htmlFor="name" hint="Shown only to you; never on public reviews.">
          <Input id="name" autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How should we address you?" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 10 characters, with upper, lower, and a number.">
          <PasswordField id="password" autoComplete="new-password" value={password} onChange={setPassword} />
        </Field>

        <div className="flex items-start gap-2.5 rounded-md border border-border bg-background/70 p-3">
          <input id="accept-terms" type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]" />
          <label htmlFor="accept-terms" className="text-xs leading-relaxed text-muted-foreground">
            I agree to RenTrust&apos;s <Link href="/legal/terms" className="font-medium text-primary underline-offset-2 hover:underline">Terms</Link> and <Link href="/legal/privacy" className="font-medium text-primary underline-offset-2 hover:underline">Privacy Policy</Link>.
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 t-meta text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} disabled={!accepted} size="lg" className="w-full">Create account</Button>
      </form>

      <p className="mt-5 text-center t-meta">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">Sign in</Link>
      </p>
    </Card>
  );
}
