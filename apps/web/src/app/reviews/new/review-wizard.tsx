'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import type { Property } from '@/lib/types';
import { PROPERTY_TYPE_LABELS } from '@/lib/labels';
import { Button } from '@/components/ui/button';
import { Card, Field } from '@/components/ui/primitives';
import { ChoicePicker, RatingPicker, TagPicker } from './controls';

const LIKED_TAGS = [
  'spacious', 'well_maintained', 'responsive_management', 'safe_neighbourhood', 'good_water_supply',
  'reliable_power', 'quiet', 'good_amenities', 'great_location', 'fair_deposit_handling',
  'friendly_neighbours', 'value_for_money',
] as const;
const DISLIKED_TAGS = [
  'poor_maintenance', 'unresponsive_management', 'water_issues', 'power_cuts', 'noisy',
  'safety_concerns', 'deposit_disputes', 'hidden_charges', 'strict_rules', 'parking_issues',
  'pest_issues', 'poor_internet',
] as const;

interface Draft {
  tenure: string | null;
  managementResponsiveness: number | null;
  maintenanceQuality: number | null;
  maintenanceResolution: string | null;
  depositOutcome: string | null;
  deductionsExplained: string | null;
  communication: number | null;
  safety: number | null;
  waterSupply: number | null;
  internet: number | null;
  internetNa: boolean;
  noise: number | null;
  rulesStrictness: number | null;
  wouldRentAgain: string | null;
  wouldRecommend: boolean | null;
  likedTags: string[];
  likedText: string;
  dislikedTags: string[];
  dislikedText: string;
  comments: string;
}

const STEPS = ['Your stay', 'Management', 'Property experience', 'Deposit', 'Living experience', 'Written review', 'Preview'] as const;

export function ReviewWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const propertyId = params.get('propertyId') ?? '';
  const { user, request } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [d, setD] = useState<Draft>({
    tenure: null, managementResponsiveness: null, maintenanceQuality: null, maintenanceResolution: null,
    depositOutcome: null, deductionsExplained: null, communication: null, safety: null, waterSupply: null,
    internet: null, internetNa: false, noise: null, rulesStrictness: null, wouldRentAgain: null,
    wouldRecommend: null, likedTags: [], likedText: '', dislikedTags: [], dislikedText: '', comments: '',
  });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!propertyId) return;
    apiFetch<Property>(`/properties/${propertyId}`).then(({ data }) => setProperty(data)).catch(() => setProperty(null));
  }, [propertyId]);

  const canAdvance = (() => {
    switch (step) {
      case 0: return !!d.tenure;
      case 1: return d.managementResponsiveness != null && d.communication != null;
      case 2: return d.maintenanceQuality != null && d.maintenanceResolution != null && d.safety != null && d.waterSupply != null && d.noise != null && d.rulesStrictness != null && (d.internetNa || d.internet != null);
      case 3: return !!d.depositOutcome && !!d.deductionsExplained;
      case 4: return !!d.wouldRentAgain && d.wouldRecommend != null;
      default: return true;
    }
  })();

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await request('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          propertyId, tenure: d.tenure,
          managementResponsiveness: d.managementResponsiveness, maintenanceQuality: d.maintenanceQuality,
          maintenanceResolution: d.maintenanceResolution, depositOutcome: d.depositOutcome,
          deductionsExplained: d.deductionsExplained, communication: d.communication, safety: d.safety,
          waterSupply: d.waterSupply, internet: d.internetNa ? undefined : d.internet, noise: d.noise,
          rulesStrictness: d.rulesStrictness, wouldRentAgain: d.wouldRentAgain, wouldRecommend: d.wouldRecommend,
          likedTags: d.likedTags, likedText: d.likedText || undefined, dislikedTags: d.dislikedTags,
          dislikedText: d.dislikedText || undefined, comments: d.comments || undefined,
        }),
      });
        router.push('/profile?reviewSubmitted=1');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your review.');
      setSubmitting(false);
    }
  }

  if (!propertyId) return <Card className="p-7"><p className="t-body text-muted-foreground">No property selected to review.</p></Card>;
  if (!user)
    return (
      <Card className="p-7" elevated>
        <p className="t-body text-muted-foreground">Please sign in to write a review.</p>
        <Button className="mt-4" onClick={() => router.push(`/login?next=/reviews/new?propertyId=${propertyId}`)}>Sign in</Button>
      </Card>
    );

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between t-meta">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span className="text-foreground">{STEPS[step]}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-pill bg-muted">
          <div className="h-full rounded-pill bg-primary transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        {property && (
          <p className="mt-3 t-meta">
            Reviewing <span className="font-medium text-foreground">{property.displayName}</span> · {PROPERTY_TYPE_LABELS[property.propertyType]}
          </p>
        )}
      </div>

      <Card className="p-6" elevated key={step}>
        {step === 0 && (
          <StepBlock title="How long did you live here?">
            <ChoicePicker value={d.tenure} onChange={(v) => set('tenure', v)} options={[
              { value: 'LT_3_MONTHS', label: 'Less than 3 months' }, { value: 'M3_6', label: '3–6 months' },
              { value: 'M6_12', label: '6–12 months' }, { value: 'Y1_2', label: '1–2 years' }, { value: 'GT_2_YEARS', label: '2+ years' },
            ]} />
          </StepBlock>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <StepBlock title="How responsive was management?"><RatingPicker value={d.managementResponsiveness} onChange={(v) => set('managementResponsiveness', v)} lowLabel="Unresponsive" highLabel="Very responsive" /></StepBlock>
            <StepBlock title="How was communication?"><RatingPicker value={d.communication} onChange={(v) => set('communication', v)} /></StepBlock>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <StepBlock title="How good was maintenance?"><RatingPicker value={d.maintenanceQuality} onChange={(v) => set('maintenanceQuality', v)} /></StepBlock>
            <StepBlock title="How quickly were issues resolved?">
              <ChoicePicker value={d.maintenanceResolution} onChange={(v) => set('maintenanceResolution', v)} options={[
                { value: 'LT_24H', label: 'Within 24 hours' }, { value: 'D1_3', label: '1–3 days' }, { value: 'D3_7', label: '3–7 days' }, { value: 'GT_7D', label: 'More than a week' },
              ]} />
            </StepBlock>
            <StepBlock title="How safe did you feel?"><RatingPicker value={d.safety} onChange={(v) => set('safety', v)} lowLabel="Unsafe" highLabel="Very safe" /></StepBlock>
            <StepBlock title="How reliable was water supply?"><RatingPicker value={d.waterSupply} onChange={(v) => set('waterSupply', v)} /></StepBlock>
            <StepBlock title="How was internet availability?">
              <RatingPicker value={d.internet} onChange={(v) => { set('internet', v); set('internetNa', false); }} />
              <button type="button" onClick={() => { set('internetNa', !d.internetNa); set('internet', null); }} className={`mt-2 t-meta ${d.internetNa ? 'text-primary' : 'hover:text-foreground'}`}>
                {d.internetNa ? '✓ Not applicable' : 'Not applicable'}
              </button>
            </StepBlock>
            <StepBlock title="How noisy was the property?"><RatingPicker value={d.noise} onChange={(v) => set('noise', v)} lowLabel="Very noisy" highLabel="Very quiet" /></StepBlock>
            <StepBlock title="How strict were the rules?"><RatingPicker value={d.rulesStrictness} onChange={(v) => set('rulesStrictness', v)} lowLabel="Relaxed" highLabel="Very strict" /></StepBlock>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <StepBlock title="Was the security deposit returned?">
              <ChoicePicker value={d.depositOutcome} onChange={(v) => set('depositOutcome', v)} options={[
                { value: 'FULL', label: 'Returned in full' }, { value: 'PARTIAL', label: 'Partially returned' }, { value: 'NOT_RETURNED', label: 'Not returned' }, { value: 'STILL_WAITING', label: 'Still waiting' },
              ]} />
            </StepBlock>
            <StepBlock title="Were deductions explained?">
              <ChoicePicker value={d.deductionsExplained} onChange={(v) => set('deductionsExplained', v)} options={[
                { value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }, { value: 'NOT_APPLICABLE', label: 'Not applicable' },
              ]} />
            </StepBlock>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <StepBlock title="Would you rent here again?">
              <ChoicePicker value={d.wouldRentAgain} onChange={(v) => set('wouldRentAgain', v)} options={[
                { value: 'YES', label: 'Yes' }, { value: 'MAYBE', label: 'Maybe' }, { value: 'NO', label: 'No' },
              ]} />
            </StepBlock>
            <StepBlock title="Would you recommend this property?">
              <ChoicePicker value={d.wouldRecommend === null ? null : d.wouldRecommend ? 'YES' : 'NO'} onChange={(v) => set('wouldRecommend', v === 'YES')} options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
            </StepBlock>
            <StepBlock title="What did you like?"><TagPicker values={d.likedTags} onChange={(v) => set('likedTags', v)} options={LIKED_TAGS} /></StepBlock>
            <StepBlock title="What did you dislike?"><TagPicker values={d.dislikedTags} onChange={(v) => set('dislikedTags', v)} options={DISLIKED_TAGS} /></StepBlock>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <Field label="Anything you especially liked? (optional)">
              <textarea value={d.likedText} onChange={(e) => set('likedText', e.target.value)} rows={2} maxLength={2000}
                className="w-full rounded-lg border border-input bg-card p-3 t-body text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" placeholder="e.g. Great natural light and friendly neighbours." />
            </Field>
            <Field label="Anything that frustrated you? (optional)">
              <textarea value={d.dislikedText} onChange={(e) => set('dislikedText', e.target.value)} rows={2} maxLength={2000}
                className="w-full rounded-lg border border-input bg-card p-3 t-body text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" placeholder="Keep it factual; avoid personal details." />
            </Field>
            <Field label="Additional comments (optional)" hint="Avoid names, phone numbers, or unit numbers.">
              <textarea value={d.comments} onChange={(e) => set('comments', e.target.value)} rows={4} maxLength={4000}
                className="w-full rounded-lg border border-input bg-card p-3 t-body text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
            </Field>
            <div className="flex items-start gap-2.5 rounded-lg bg-primary/[0.06] p-4">
              <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p className="t-meta text-foreground/80">
                Your review is anonymous. It appears publicly as <span className="font-medium text-foreground">“Verified Resident”</span> with your tenure and month — never your name, email, or unit.
              </p>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="t-title3 text-foreground">Preview & submit</h2>
            <p className="t-meta">After you submit, your review goes to moderation before it&apos;s published.</p>
            <dl className="divide-y divide-border rounded-lg border border-border">
              <Row label="Stay" value={d.tenure ?? '—'} />
              <Row label="Management" value={`${d.managementResponsiveness}/5`} />
              <Row label="Maintenance" value={`${d.maintenanceQuality}/5`} />
              <Row label="Deposit" value={d.depositOutcome ?? '—'} />
              <Row label="Would rent again" value={d.wouldRentAgain ?? '—'} />
              <Row label="Recommend" value={d.wouldRecommend ? 'Yes' : 'No'} />
            </dl>
            {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 t-meta text-destructive">{error}</p>}
          </div>
        )}
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>Back</Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance}>Continue</Button>
        ) : (
          <Button onClick={submit} loading={submitting}>
            <ShieldCheck className="size-4" aria-hidden /> Submit review
          </Button>
        )}
      </div>
    </div>
  );
}

function StepBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="t-title3 text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="t-meta">{label}</dt>
      <dd className="t-label text-foreground">{value}</dd>
    </div>
  );
}
