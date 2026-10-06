import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Building2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import type { PropertyDetail, PublicReview, TrustScore as TrustScoreT } from '@/lib/types';
import { CATEGORY_LABELS, PROPERTY_TYPE_LABELS, humanizeTag } from '@/lib/labels';
import { Badge, Card, EmptyState, Section } from '@/components/ui/primitives';
import { LinkButton } from '@/components/ui/button';
import { TrustScore, CategoryRow } from '@/components/trust-score/trust-score';
import { ReviewCard } from '@/components/review/review-card';
import { SaveButton } from '@/components/property/save-button';

export const dynamic = 'force-dynamic';

async function getData(id: string) {
  try {
    const [detail, score, reviews] = await Promise.all([
      apiFetch<PropertyDetail>(`/properties/${id}`),
      apiFetch<TrustScoreT>(`/properties/${id}/score`),
      apiFetch<PublicReview[]>(`/properties/${id}/reviews?limit=20`),
    ]);
    return { detail: detail.data, score: score.data, reviews: reviews.data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}

export default async function PropertyPage({ params }: { params: { id: string } }) {
  const { detail, score, reviews } = await getData(params.id);

  return (
    <Section className="py-10">
      {/* ── Hero ── */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="brand">{PROPERTY_TYPE_LABELS[detail.propertyType] ?? detail.propertyType}</Badge>
            {detail.isClaimed && <Badge tone="success">Claimed</Badge>}
          </div>
          <h1 className="t-page-title text-foreground">{detail.displayName}</h1>
          <p className="mt-1.5 flex items-center gap-1.5 t-callout text-muted-foreground">
            <MapPin className="size-4" aria-hidden />
            {detail.locality?.name ? `${detail.locality.name}, Bengaluru` : 'Bengaluru'}
            {detail.developer && <span className="text-muted-foreground/60">· {detail.developer}</span>}
            {detail.yearBuilt && <span className="text-muted-foreground/60">· Built {detail.yearBuilt}</span>}
          </p>
        </div>
        <div className="flex gap-2.5">
          <SaveButton propertyId={detail.id} />
          <LinkButton href={`/reviews/new?propertyId=${detail.id}`}>Write a review</LinkButton>
        </div>
      </div>

      {/* ── Score + breakdown ── */}
      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-7" elevated>
          {score.hasEnoughData && score.overall != null ? (
            <>
              <TrustScore score={score.overall} sampleSize={score.sampleSize} />
              {score.lowConfidence && (
                <p className="mt-4 rounded-md bg-warning/10 px-3 py-2 t-meta text-warning">
                  Few reviews so far — read them in full before deciding.
                </p>
              )}
              {score.lastCalculatedAt && (
                <p className="mt-4 t-helper">
                  Updated {new Date(score.lastCalculatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </>
          ) : (
            <div className="py-4">
              <p className="t-title3 text-foreground">Not enough data yet</p>
              <p className="mt-1.5 t-callout text-muted-foreground">
                {score.message ?? 'This property needs more verified resident experiences.'}
              </p>
            </div>
          )}
        </Card>

        {score.hasEnoughData && (
          <Card className="p-7">
            <h2 className="t-title3 text-foreground">Why this score</h2>
            <div className="mt-5 space-y-3.5">
              {Object.entries(score.categoryScores).map(([key, val]) => (
                <CategoryRow key={key} label={CATEGORY_LABELS[key] ?? key} score={val.score} />
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Sentiment themes ── */}
      {score.hasEnoughData && (score.positiveThemes.length > 0 || score.negativeThemes.length > 0) && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <ThemeCard title="What residents like" tone="success" themes={score.positiveThemes} />
          <ThemeCard title="Common complaints" tone="warning" themes={score.negativeThemes} />
        </div>
      )}

      {/* ── Amenities ── */}
      {detail.amenities.length > 0 && (
        <Card className="mt-5 p-6">
          <h2 className="t-title3 text-foreground">Amenities</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {detail.amenities.map((a) => (
              <span key={a} className="rounded-md border border-border bg-muted/50 px-2.5 py-1 t-meta text-foreground/80">{a}</span>
            ))}
          </div>
        </Card>
      )}

      {/* ── Reviews ── */}
      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="t-section-title text-foreground">Resident experiences</h2>
          <span className="t-meta">{detail.reviewCount} published</span>
        </div>

        {reviews.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            body="If you've lived here, share your experience to help the next renter."
            action={<LinkButton href={`/reviews/new?propertyId=${detail.id}`} size="sm">Write the first review</LinkButton>}
          />
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}

        <p className="mt-6 t-helper">
          Reviews reflect individual resident experiences, not verified platform facts.{' '}
          <Link href="/guidelines" className="text-primary hover:underline">Review guidelines</Link>.
        </p>
      </section>
    </Section>
  );
}

function ThemeCard({ title, tone, themes }: { title: string; tone: 'success' | 'warning'; themes: string[] }) {
  return (
    <Card className="p-6">
      <h3 className="t-meta font-medium text-foreground">{title}</h3>
      {themes.length === 0 ? (
        <p className="mt-2 t-meta">Not enough data yet.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {themes.map((t) => (
            <Badge key={t} tone={tone}>{humanizeTag(t)}</Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
