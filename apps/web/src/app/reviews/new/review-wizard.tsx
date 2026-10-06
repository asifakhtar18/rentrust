'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import type { Property } from '@/lib/types';
import { PROPERTY_TYPE_LABELS } from '@/lib/labels';
import { Button, Card, Field, Input } from '@/components/ui';
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

const STEPS = [
  'Your residency',
  'Management',
  'Property experience',
  'Deposit',
  'Living experience',
  'Comments',
  'Verification',
  'Preview',
] as const;

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
    tenure: null,
    managementResponsiveness: null,
    maintenanceQuality: null,
    maintenanceResolution: null,
    depositOutcome: null,
    deductionsExplained: null,
    communication: null,
    safety: null,
    waterSupply: null,
    internet: null,
    internetNa: false,
    noise: null,
    rulesStrictness: null,
    wouldRentAgain: null,
    wouldRecommend: null,
    likedTags: [],
    likedText: '',
    dislikedTags: [],
    dislikedText: '',
    comments: '',
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    if (!propertyId) return;
    apiFetch<Property>(`/properties/${propertyId}`)
      .then(({ data }) => setProperty(data))
      .catch(() => setProperty(null));
  }, [propertyId]);

  const canAdvance = (() => {
    switch (step) {
      case 0:
        return !!d.tenure;
      case 1:
        return d.managementResponsiveness != null && d.communication != null;
      case 2:
        return (
          d.maintenanceQuality != null &&
          d.maintenanceResolution != null &&
          d.safety != null &&
          d.waterSupply != null &&
          d.noise != null &&
          d.rulesStrictness != null &&
          (d.internetNa || d.internet != null)
        );
      case 3:
        return !!d.depositOutcome && !!d.deductionsExplained;
      case 4:
        return !!d.wouldRentAgain && d.wouldRecommend != null;
      default:
        return true;
    }
  })();

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        propertyId,
        tenure: d.tenure,
        managementResponsiveness: d.managementResponsiveness,
        maintenanceQuality: d.maintenanceQuality,
        maintenanceResolution: d.maintenanceResolution,
        depositOutcome: d.depositOutcome,
        deductionsExplained: d.deductionsExplained,
        communication: d.communication,
        safety: d.safety,
        waterSupply: d.waterSupply,
        internet: d.internetNa ? undefined : d.internet,
        noise: d.noise,
        rulesStrictness: d.rulesStrictness,
        wouldRentAgain: d.wouldRentAgain,
        wouldRecommend: d.wouldRecommend,
        likedTags: d.likedTags,
        likedText: d.likedText || undefined,
        dislikedTags: d.dislikedTags,
        dislikedText: d.dislikedText || undefined,
        comments: d.comments || undefined,
      };
      await request('/reviews', { method: 'POST', body: JSON.stringify(payload) });
      router.push(`/properties/${propertyId}?submitted=1`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your review.');
      setSubmitting(false);
    }
  }

  if (!propertyId) {
    return <Card className="p-7 text-body text-ink-secondary">No property selected to review.</Card>;
  }
  if (!user) {
    return (
      <Card className="p-7">
        <p className="text-body text-ink-secondary">Please sign in to write a review.</p>
        <Button className="mt-4" onClick={() => router.push(`/login?next=/reviews/new?propertyId=${propertyId}`)}>
          Sign in
        </Button>
      </Card>
    );
  }

  return (
    <div>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-caption text-ink-tertiary">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/8">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        {property && (
          <p className="mt-3 text-footnote text-ink-secondary">
            Reviewing <span className="font-medium text-ink">{property.displayName}</span>
            {' · '}
            {PROPERTY_TYPE_LABELS[property.propertyType]}
          </p>
        )}
      </div>

      <Card className="animate-fade-rise p-6" key={step}>
        {step === 0 && (
          <Step title="How long did you live here?">
            <ChoicePicker
              value={d.tenure}
              onChange={(v) => set('tenure', v)}
              options={[
                { value: 'LT_3_MONTHS', label: 'Less than 3 months' },
                { value: 'M3_6', label: '3–6 months' },
                { value: 'M6_12', label: '6–12 months' },
                { value: 'Y1_2', label: '1–2 years' },
                { value: 'GT_2_YEARS', label: '2+ years' },
              ]}
            />
          </Step>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <Step title="How responsive was management?">
              <RatingPicker
                value={d.managementResponsiveness}
                onChange={(v) => set('managementResponsiveness', v)}
                lowLabel="Unresponsive"
                highLabel="Very responsive"
              />
            </Step>
            <Step title="How was communication?">
              <RatingPicker value={d.communication} onChange={(v) => set('communication', v)} />
            </Step>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Step title="How good was maintenance?">
              <RatingPicker value={d.maintenanceQuality} onChange={(v) => set('maintenanceQuality', v)} />
            </Step>
            <Step title="How quickly were issues resolved?">
              <ChoicePicker
                value={d.maintenanceResolution}
                onChange={(v) => set('maintenanceResolution', v)}
                options={[
                  { value: 'LT_24H', label: 'Within 24 hours' },
                  { value: 'D1_3', label: '1–3 days' },
                  { value: 'D3_7', label: '3–7 days' },
                  { value: 'GT_7D', label: 'More than a week' },
                ]}
              />
            </Step>
            <Step title="How safe did you feel?">
              <RatingPicker value={d.safety} onChange={(v) => set('safety', v)} lowLabel="Unsafe" highLabel="Very safe" />
            </Step>
            <Step title="How reliable was water supply?">
              <RatingPicker value={d.waterSupply} onChange={(v) => set('waterSupply', v)} />
            </Step>
            <Step title="How was internet availability?">
              <RatingPicker value={d.internet} onChange={(v) => { set('internet', v); set('internetNa', false); }} />
              <button
                type="button"
                onClick={() => { set('internetNa', !d.internetNa); set('internet', null); }}
                className={`mt-2 text-caption ${d.internetNa ? 'text-accent' : 'text-ink-tertiary hover:text-ink'}`}
              >
                {d.internetNa ? '✓ Not applicable' : 'Not applicable'}
              </button>
            </Step>
            <Step title="How noisy was the property?">
              <RatingPicker value={d.noise} onChange={(v) => set('noise', v)} lowLabel="Very noisy" highLabel="Very quiet" />
            </Step>
            <Step title="How strict were the rules?">
              <RatingPicker value={d.rulesStrictness} onChange={(v) => set('rulesStrictness', v)} lowLabel="Relaxed" highLabel="Very strict" />
            </Step>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <Step title="Was the security deposit returned?">
              <ChoicePicker
                value={d.depositOutcome}
                onChange={(v) => set('depositOutcome', v)}
                options={[
                  { value: 'FULL', label: 'Returned in full' },
                  { value: 'PARTIAL', label: 'Partially returned' },
                  { value: 'NOT_RETURNED', label: 'Not returned' },
                  { value: 'STILL_WAITING', label: 'Still waiting' },
                ]}
              />
            </Step>
            <Step title="Were deductions explained?">
              <ChoicePicker
                value={d.deductionsExplained}
                onChange={(v) => set('deductionsExplained', v)}
                options={[
                  { value: 'YES', label: 'Yes' },
                  { value: 'NO', label: 'No' },
                  { value: 'NOT_APPLICABLE', label: 'Not applicable' },
                ]}
              />
            </Step>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <Step title="Would you rent here again?">
              <ChoicePicker
                value={d.wouldRentAgain}
                onChange={(v) => set('wouldRentAgain', v)}
                options={[
                  { value: 'YES', label: 'Yes' },
                  { value: 'MAYBE', label: 'Maybe' },
                  { value: 'NO', label: 'No' },
                ]}
              />
            </Step>
            <Step title="Would you recommend this property?">
              <ChoicePicker
                value={d.wouldRecommend === null ? null : d.wouldRecommend ? 'YES' : 'NO'}
                onChange={(v) => set('wouldRecommend', v === 'YES')}
                options={[
                  { value: 'YES', label: 'Yes' },
                  { value: 'NO', label: 'No' },
                ]}
              />
            </Step>
            <Step title="What did you like?">
              <TagPicker values={d.likedTags} onChange={(v) => set('likedTags', v)} options={LIKED_TAGS} />
            </Step>
            <Step title="What did you dislike?">
              <TagPicker values={d.dislikedTags} onChange={(v) => set('dislikedTags', v)} options={DISLIKED_TAGS} />
            </Step>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <Field label="Anything you especially liked? (optional)">
              <textarea
                value={d.likedText}
                onChange={(e) => set('likedText', e.target.value)}
                rows={2}
                maxLength={2000}
                className="w-full rounded-xl bg-canvas p-3 text-body text-ink placeholder:text-ink-tertiary focus:outline-none"
                placeholder="e.g. Great natural light and friendly neighbours."
              />
            </Field>
            <Field label="Anything that frustrated you? (optional)">
              <textarea
                value={d.dislikedText}
                onChange={(e) => set('dislikedText', e.target.value)}
                rows={2}
                maxLength={2000}
                className="w-full rounded-xl bg-canvas p-3 text-body text-ink placeholder:text-ink-tertiary focus:outline-none"
                placeholder="Keep it factual and avoid sharing personal details."
              />
            </Field>
            <Field label="Additional comments (optional)" hint="Avoid names, phone numbers, or unit numbers.">
              <textarea
                value={d.comments}
                onChange={(e) => set('comments', e.target.value)}
                rows={4}
                maxLength={4000}
                className="w-full rounded-xl bg-canvas p-3 text-body text-ink placeholder:text-ink-tertiary focus:outline-none"
              />
            </Field>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <Step title="Verification (optional)">
              <p className="text-body text-ink-secondary">
                You can verify your residency after submitting to earn a{' '}
                <span className="font-medium text-ink">Verified Resident</span> badge. Verification
                documents are private and never shown publicly.
              </p>
            </Step>
            <div className="rounded-xl bg-accent/8 p-4">
              <p className="text-footnote font-medium text-accent">Your review is anonymous</p>
              <p className="mt-1 text-footnote text-ink-secondary">
                It will appear publicly as{' '}
                <span className="font-medium text-ink">“Verified Resident”</span> with your tenure and
                month — never your name, email, or unit.
              </p>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <h2 className="text-title3 font-semibold tracking-tight text-ink">Preview & submit</h2>
            <p className="text-footnote text-ink-secondary">
              Review your answers. After you submit, your review goes to moderation before it&apos;s
              published.
            </p>
            <dl className="divide-y divide-hairline/10 rounded-xl bg-canvas px-4">
              <Row label="Tenure" value={d.tenure ?? '—'} />
              <Row label="Management" value={`${d.managementResponsiveness}/5`} />
              <Row label="Maintenance" value={`${d.maintenanceQuality}/5`} />
              <Row label="Deposit" value={d.depositOutcome ?? '—'} />
              <Row label="Would rent again" value={d.wouldRentAgain ?? '—'} />
              <Row label="Recommend" value={d.wouldRecommend ? 'Yes' : 'No'} />
            </dl>
            {error && (
              <p role="alert" className="rounded-xl bg-critical/10 px-3 py-2 text-footnote text-critical">
                {error}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Nav */}
      <div className="mt-5 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance}>
            Continue
          </Button>
        ) : (
          <Button onClick={submit} loading={submitting}>
            Submit review
          </Button>
        )}
      </div>
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-title3 font-semibold tracking-tight text-ink">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-footnote text-ink-tertiary">{label}</dt>
      <dd className="text-footnote font-medium text-ink">{value}</dd>
    </div>
  );
}
