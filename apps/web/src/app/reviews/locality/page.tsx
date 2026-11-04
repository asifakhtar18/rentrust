'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, Field, Section } from '@/components/ui/primitives';
import type { TenureBucket } from '@/lib/types';
import { TENURE_LABELS } from '@/lib/labels';

const QUESTIONS = [
  { key: 'municipalServices', label: 'Municipal services and waste collection' },
  { key: 'publicTransport', label: 'Public transport and getting around' },
  { key: 'healthcareAccess', label: 'Access to clinics and healthcare' },
  { key: 'foodAndGroceries', label: 'Food, groceries, and daily essentials' },
  { key: 'safety', label: 'Personal safety' },
  { key: 'cleanliness', label: 'Street cleanliness and upkeep' },
  { key: 'neighbourliness', label: 'Neighbourliness and community feel' },
] as const;
type RatingKey = (typeof QUESTIONS)[number]['key'];
type Draft = Record<RatingKey, string>;
const EMPTY: Draft = {
  municipalServices: '', publicTransport: '', healthcareAccess: '', foodAndGroceries: '',
  safety: '', cleanliness: '', neighbourliness: '',
};
const TENURES: TenureBucket[] = ['LT_3_MONTHS', 'M3_6', 'M6_12', 'Y1_2', 'GT_2_YEARS'];

export default function LocalityReviewPage() {
  const params = useSearchParams();
  const router = useRouter();
  const localityId = params.get('localityId') ?? '';
  const { user, loading, request } = useAuth();
  const [ratings, setRatings] = useState<Draft>(EMPTY);
  const [tenure, setTenure] = useState<TenureBucket | ''>('');
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!localityId || !tenure || QUESTIONS.some(({ key }) => !ratings[key])) return;
    setBusy(true);
    setError('');
    try {
      await request(`/localities/${encodeURIComponent(localityId)}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ tenure, ...Object.fromEntries(Object.entries(ratings).map(([key, value]) => [key, Number(value)])), comments: comments.trim() || undefined }),
      });
      router.push('/profile?areaReviewSubmitted=1');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit your area review.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Section className="py-16"><p role="status" className="t-meta">Checking your account…</p></Section>;
  if (!user) return (
    <Section className="max-w-2xl py-14">
      <Link href="/login" className="inline-flex items-center gap-2 t-meta text-primary"><ArrowLeft className="size-4" aria-hidden />Sign in to review this area</Link>
      <h1 className="mt-6 t-page-title text-foreground">Share your neighbourhood experience</h1>
      <p className="mt-3 t-body text-muted-foreground">Area reviews are separate from ratings of a rental building. They cover daily services and the wider community.</p>
    </Section>
  );

  return (
    <Section className="max-w-3xl py-10 sm:py-14">
      <Link href={localityId ? `/localities/${encodeURIComponent(localityId)}` : '/map'} className="inline-flex items-center gap-2 t-meta text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" aria-hidden />Back to area</Link>
      <div className="mt-6"><p className="eyebrow"><MapPin className="mr-1 inline size-3.5" aria-hidden />Neighbourhood review</p><h1 className="mt-2 t-page-title text-foreground">How is this area to live in?</h1><p className="mt-3 max-w-xl t-body text-muted-foreground">Rate the neighbourhood itself, not your landlord or building. Your public review uses an anonymous resident alias and is checked before it appears.</p></div>
      {!localityId && <p role="alert" className="mt-5 rounded-md bg-destructive/10 p-3 t-meta text-destructive">Choose a neighbourhood from its area page before writing a review.</p>}
      {error && <p role="alert" className="mt-5 rounded-md bg-destructive/10 p-3 t-meta text-destructive">{error}</p>}
      <Card as="section" elevated className="mt-6 p-5 sm:p-7">
        <form onSubmit={(event) => void submit(event)} className="space-y-6">
          <Field label="How long have you lived in or around this area?" htmlFor="area-tenure">
            <select id="area-tenure" required value={tenure} onChange={(event) => setTenure(event.target.value as TenureBucket | '')} className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground">
              <option value="">Choose your time here</option>{TENURES.map((value) => <option key={value} value={value}>{TENURE_LABELS[value]}</option>)}
            </select>
          </Field>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {QUESTIONS.map(({ key, label }) => <Field key={key} label={label} htmlFor={`area-${key}`}>
              <select id={`area-${key}`} required value={ratings[key]} onChange={(event) => setRatings((current) => ({ ...current, [key]: event.target.value }))} className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground">
                <option value="">Choose a rating</option><option value="1">1 · Very poor</option><option value="2">2 · Poor</option><option value="3">3 · Mixed / average</option><option value="4">4 · Good</option><option value="5">5 · Excellent</option>
              </select>
            </Field>)}
          </div>
          <Field label="What should someone know about living here?" htmlFor="area-comments" hint="Optional. Avoid names, exact addresses, and personal information.">
            <textarea id="area-comments" value={comments} onChange={(event) => setComments(event.target.value)} maxLength={2000} rows={5} className="w-full rounded-md border border-input bg-card px-3.5 py-3 t-body text-foreground" placeholder="For example: buses are frequent, but rubbish collection is irregular…" />
          </Field>
          <div className="flex flex-wrap items-center gap-3"><Button type="submit" loading={busy} disabled={!localityId || !tenure || QUESTIONS.some(({ key }) => !ratings[key])}>Submit area review</Button><LinkButton href={localityId ? `/localities/${encodeURIComponent(localityId)}` : '/map'} variant="secondary">Cancel</LinkButton></div>
        </form>
      </Card>
    </Section>
  );
}
