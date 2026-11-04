import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MapPin, Building2, ThumbsUp, ThumbsDown, ChevronRight } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import type { LocalityIntelligence, Property, PublicLocalityReview } from '@/lib/types';
import { CATEGORY_LABELS, PROPERTY_TYPE_LABELS, humanizeTag } from '@/lib/labels';
import { TENURE_LABELS } from '@/lib/labels';
import { Badge, Card, EmptyState, Section } from '@/components/ui/primitives';
import { LinkButton } from '@/components/ui/button';
import { TrustScore, CategoryRow } from '@/components/trust-score/trust-score';

const AREA_LABELS: Record<string, string> = {
  municipalServices: 'Municipal services',
  publicTransport: 'Public transport',
  healthcareAccess: 'Healthcare access',
  foodAndGroceries: 'Food and groceries',
  safety: 'Safety',
  cleanliness: 'Cleanliness',
  neighbourliness: 'Neighbourliness',
};

export const dynamic = 'force-dynamic';

async function getData(id: string) {
  const [intel, properties, areaReviews] = await Promise.all([
    apiFetch<LocalityIntelligence>(`/localities/${id}`),
    apiFetch<Property[]>(`/properties?localityId=${id}&limit=50`),
    apiFetch<PublicLocalityReview[]>(`/localities/${id}/reviews`),
  ]);
  return { intel: intel.data, properties: properties.data, areaReviews: areaReviews.data };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const { data } = await apiFetch<LocalityIntelligence>(`/localities/${params.id}`);
    return {
      title: `${data.locality.name} rentals · RenTrust`,
      description: `Resident sentiment and trust scores for rental properties in ${data.locality.name}, based on verified reviews.`,
    };
  } catch {
    return { title: 'Locality · RenTrust' };
  }
}

export default async function LocalityPage({ params }: { params: { id: string } }) {
  let data: Awaited<ReturnType<typeof getData>>;
  try {
    data = await getData(params.id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <Section className="py-10">
        <EmptyState
          title="Area details are temporarily unavailable"
          body="We couldn't load this area's information right now. Please try again in a moment."
          action={<LinkButton href="/search" variant="secondary">Back to search</LinkButton>}
        />
      </Section>
    );
  }
  const { intel, properties, areaReviews } = data;

  return (
    <Section className="py-10">
      {/* ── Hero ── */}
      <div>
        <Badge tone="brand">Locality</Badge>
        <h1 className="mt-2 t-page-title text-foreground">{intel.locality.name}</h1>
        <p className="mt-1.5 flex items-center gap-1.5 t-callout text-muted-foreground">
          <MapPin className="size-4" aria-hidden />
          {[intel.locality.city?.name, intel.locality.city?.state?.name].filter(Boolean).join(', ')}
          {intel.locality.city && ' · '}{intel.propertyCount} {intel.propertyCount === 1 ? 'property' : 'properties'} tracked
        </p>
      </div>

      <section className="mt-8" aria-labelledby="area-experience-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Neighbourhood experience</p>
            <h2 id="area-experience-title" className="mt-2 t-section-title text-foreground">How is it to live in {intel.locality.name}?</h2>
            <p className="mt-1.5 t-meta">Rate municipal services, transport, healthcare, food access, safety, cleanliness, and neighbours.</p>
          </div>
          <LinkButton href={`/reviews/locality?localityId=${encodeURIComponent(intel.locality.id)}`} size="sm">Review this area</LinkButton>
        </div>
        {areaReviews.length === 0 ? (
          <EmptyState title="No area reviews yet" body="Property reviews are about individual buildings. Add the first separate neighbourhood review to help people understand the area." action={<LinkButton href={`/reviews/locality?localityId=${encodeURIComponent(intel.locality.id)}`} size="sm">Share an area review</LinkButton>} />
        ) : (
          <>
            <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
              <Card elevated className="p-6">
                <p className="eyebrow">Area experience</p>
                <p className="mt-3 font-serif text-5xl text-foreground">{intel.areaExperience?.overallAverage?.toFixed(1) ?? '—'}<span className="ml-1 text-2xl text-muted-foreground">/ 5</span></p>
                <p className="mt-2 t-meta">From {intel.areaExperience?.reviewCount ?? areaReviews.length} approved area {areaReviews.length === 1 ? 'review' : 'reviews'}</p>
              </Card>
              <Card elevated className="p-6">
                <p className="eyebrow mb-4">Area categories · out of 5</p>
                <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {Object.entries(intel.areaExperience?.categoryAverages ?? {}).map(([key, score]) => (
                    <div key={key} className="flex items-center justify-between gap-3 border-b border-border pb-2 t-meta">
                      <span>{AREA_LABELS[key] ?? key}</span><strong className="tabular text-foreground">{score.toFixed(1)} / 5</strong>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="mt-4 space-y-3">
              {areaReviews.map((review) => <article key={review.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="t-label text-foreground">{review.authorAlias}</p><p className="t-meta">{review.overall?.toFixed(1) ?? '—'} / 5 · {TENURE_LABELS[review.tenure] ?? review.tenure}</p></div>
                {review.comments && <p className="mt-3 t-body text-muted-foreground">{review.comments}</p>}
              </article>)}
            </div>
          </>
        )}
      </section>

      {intel.hasEnoughData ? (
        <>
          {/* ── Aggregate score + category averages ── */}
          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            <Card className="p-7" elevated>
              <p className="eyebrow mb-3">Average property trust</p>
              <TrustScore score={intel.averageTrustScore ?? 0} sampleSize={intel.totalReviews ?? 0} />
              <p className="mt-5 t-helper">
                Averaged across {intel.scoredPropertyCount}{' '}
                {intel.scoredPropertyCount === 1 ? 'property' : 'properties'} with enough verified reviews.
              </p>
            </Card>

            <Card className="p-7" elevated>
              <p className="eyebrow mb-4">Rental properties in this area</p>
              {intel.categoryAverages && Object.keys(intel.categoryAverages).length > 0 ? (
                <div className="space-y-3.5">
                  {Object.entries(intel.categoryAverages)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, val]) => (
                      <CategoryRow key={key} label={CATEGORY_LABELS[key] ?? key} score={val} />
                    ))}
                </div>
              ) : (
                <p className="t-body text-muted-foreground">No category breakdown available yet.</p>
              )}
            </Card>
          </div>

          {/* ── Themes ── */}
          {((intel.commonPositiveThemes?.length ?? 0) > 0 || (intel.commonComplaints?.length ?? 0) > 0) && (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {intel.commonPositiveThemes && intel.commonPositiveThemes.length > 0 && (
                <Card className="p-6">
                  <p className="mb-3 flex items-center gap-2 t-label text-foreground">
                    <ThumbsUp className="size-4 text-success" aria-hidden /> Residents often praise
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {intel.commonPositiveThemes.map((t) => (
                      <Badge key={t} tone="success">
                        {humanizeTag(t)}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}
              {intel.commonComplaints && intel.commonComplaints.length > 0 && (
                <Card className="p-6">
                  <p className="mb-3 flex items-center gap-2 t-label text-foreground">
                    <ThumbsDown className="size-4 text-destructive" aria-hidden /> Common complaints
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {intel.commonComplaints.map((t) => (
                      <Badge key={t} tone="danger">
                        {humanizeTag(t)}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="Not enough property review data yet"
            body={
              intel.message ??
              `We're still gathering property reviews in ${intel.locality.name}. This score is separate from neighbourhood experience reviews.`
            }
            action={<LinkButton href="/search" variant="secondary">Browse properties</LinkButton>}
          />
        </div>
      )}

      {/* ── Properties in this locality ── */}
      <div className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="t-section-title text-foreground">Properties in {intel.locality.name}</h2>
            <p className="mt-1 t-meta">Know a home that should be listed here? Add it for the next renter.</p>
          </div>
          <LinkButton href="/properties/suggest" size="sm">
            <Building2 className="size-4" aria-hidden />
            Add a property
          </LinkButton>
        </div>
        <div className="mt-4">
          {properties.length === 0 ? (
            <EmptyState
              title="Be the first to add a home"
              body={`There are no tracked properties in ${intel.locality.name} yet. A name and map link are enough to get started.`}
              action={<LinkButton href="/properties/suggest" size="sm"><Building2 className="size-4" aria-hidden />Add the first property</LinkButton>}
            />
          ) : (
            <Card elevated className="divide-y divide-border overflow-hidden">
              {properties.map((p) => (
                <Link
                  key={p.id}
                  href={`/properties/${p.id}`}
                  className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/60"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate t-label text-foreground group-hover:text-primary">{p.displayName}</p>
                    <p className="truncate t-meta">
                      {PROPERTY_TYPE_LABELS[p.propertyType] ?? p.propertyType}
                      {p.developer ? ` · ${p.developer}` : ''}
                    </p>
                  </div>
                  <ChevronRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              ))}
            </Card>
          )}
        </div>
      </div>
    </Section>
  );
}
