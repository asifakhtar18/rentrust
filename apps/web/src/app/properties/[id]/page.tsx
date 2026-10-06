import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import type { PropertyDetail, PublicReview, TrustScore } from '@/lib/types';
import { CATEGORY_LABELS, PROPERTY_TYPE_LABELS, humanizeTag } from '@/lib/labels';
import { Badge, Card, LinkButton } from '@/components/ui';
import { ScoreRing, CategoryBar, scoreBand } from '@/components/score-ring';
import { ReviewCard } from '@/components/review-card';
import { SaveButton } from '@/components/save-button';

export const dynamic = 'force-dynamic';

async function getData(id: string) {
  try {
    const [detail, score, reviews] = await Promise.all([
      apiFetch<PropertyDetail>(`/properties/${id}`),
      apiFetch<TrustScore>(`/properties/${id}/score`),
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
  const band = score.hasEnoughData && score.overall != null ? scoreBand(score.overall) : null;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{PROPERTY_TYPE_LABELS[detail.propertyType] ?? detail.propertyType}</Badge>
            {detail.isClaimed && <Badge tone="positive">Claimed</Badge>}
          </div>
          <h1 className="text-title1 font-semibold tracking-tight text-ink">{detail.displayName}</h1>
          <p className="mt-1 text-callout text-ink-secondary">
            {detail.locality?.name ? `${detail.locality.name}, Bengaluru` : 'Bengaluru'}
            {detail.developer && ` · ${detail.developer}`}
            {detail.yearBuilt && ` · Built ${detail.yearBuilt}`}
          </p>
        </div>
        <div className="flex gap-2">
          <SaveButton propertyId={detail.id} />
          <LinkButton href={`/reviews/new?propertyId=${detail.id}`} variant="primary">
            Write a review
          </LinkButton>
        </div>
      </div>

      {/* Score + sentiment */}
      <div className="mt-7 grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center p-7">
          {score.hasEnoughData && score.overall != null ? (
            <>
              <ScoreRing score={score.overall} size={160} stroke={14} />
              <p className="mt-4 text-callout font-medium text-ink">{band?.label} trust</p>
              <p className="mt-1 text-footnote text-ink-tertiary">
                Based on {score.sampleSize} verified {score.sampleSize === 1 ? 'response' : 'responses'}
              </p>
              {score.lowConfidence && (
                <p className="mt-3 rounded-xl bg-caution/10 px-3 py-2 text-center text-caption text-caution">
                  Few reviews so far — read them in full before deciding.
                </p>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <ScoreRing score={0} size={140} stroke={12} label={false} />
              <p className="mt-4 text-footnote text-ink-secondary">
                {score.message ?? 'Not enough verified resident data yet.'}
              </p>
              <p className="mt-2 text-caption text-ink-tertiary">Be the first to review.</p>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          {score.hasEnoughData && (
            <Card className="p-6">
              <h2 className="mb-4 text-title3 font-semibold tracking-tight text-ink">Why this score</h2>
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {Object.entries(score.categoryScores).map(([key, val]) => (
                  <CategoryBar
                    key={key}
                    label={CATEGORY_LABELS[key] ?? key}
                    score={val.score}
                    sampleSize={val.sampleSize}
                  />
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <ThemeCard title="What residents like" tone="positive" themes={score.positiveThemes} />
            <ThemeCard title="Common complaints" tone="critical" themes={score.negativeThemes} />
          </div>
        </div>
      </div>

      {/* Amenities */}
      {detail.amenities.length > 0 && (
        <Card className="mt-5 p-6">
          <h2 className="mb-3 text-title3 font-semibold tracking-tight text-ink">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {detail.amenities.map((a) => (
              <span key={a} className="rounded-full bg-ink/5 px-3 py-1 text-footnote text-ink-secondary">
                {a}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Reviews */}
      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-title2 font-semibold tracking-tight text-ink">
            Resident experiences
          </h2>
          <span className="text-footnote text-ink-tertiary">
            {detail.reviewCount} published
          </span>
        </div>

        {reviews.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-callout font-medium text-ink">No reviews yet</p>
            <p className="mx-auto mt-1 max-w-sm text-footnote text-ink-secondary">
              If you&apos;ve lived here, share your experience to help the next renter.
            </p>
            <LinkButton
              href={`/reviews/new?propertyId=${detail.id}`}
              variant="primary"
              size="sm"
              className="mt-4"
            >
              Write the first review
            </LinkButton>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}

        <p className="mt-6 text-caption text-ink-tertiary">
          Reviews reflect individual resident experiences, not verified platform facts.{' '}
          <Link href="/guidelines" className="text-accent hover:brightness-110">
            Review guidelines
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function ThemeCard({
  title,
  tone,
  themes,
}: {
  title: string;
  tone: 'positive' | 'critical';
  themes: string[];
}) {
  return (
    <Card className="p-6">
      <h3 className="mb-3 text-footnote font-medium text-ink-secondary">{title}</h3>
      {themes.length === 0 ? (
        <p className="text-footnote text-ink-tertiary">Not enough data yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <Badge key={t} tone={tone === 'positive' ? 'positive' : 'caution'}>
              {humanizeTag(t)}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
