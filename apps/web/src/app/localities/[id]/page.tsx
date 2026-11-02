import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MapPin, Building2, ThumbsUp, ThumbsDown, ChevronRight } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import type { LocalityIntelligence, Property } from '@/lib/types';
import { CATEGORY_LABELS, PROPERTY_TYPE_LABELS, humanizeTag } from '@/lib/labels';
import { Badge, Card, EmptyState, Section } from '@/components/ui/primitives';
import { LinkButton } from '@/components/ui/button';
import { TrustScore, CategoryRow } from '@/components/trust-score/trust-score';

export const dynamic = 'force-dynamic';

async function getData(id: string) {
  try {
    const [intel, properties] = await Promise.all([
      apiFetch<LocalityIntelligence>(`/localities/${id}`),
      apiFetch<Property[]>(`/properties?localityId=${id}&limit=50`),
    ]);
    return { intel: intel.data, properties: properties.data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
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
  const { intel, properties } = await getData(params.id);

  return (
    <Section className="py-10">
      {/* ── Hero ── */}
      <div>
        <Badge tone="brand">Locality</Badge>
        <h1 className="mt-2 t-page-title text-foreground">{intel.locality.name}</h1>
        <p className="mt-1.5 flex items-center gap-1.5 t-callout text-muted-foreground">
          <MapPin className="size-4" aria-hidden />
          Bengaluru · {intel.propertyCount} {intel.propertyCount === 1 ? 'property' : 'properties'} tracked
        </p>
      </div>

      {intel.hasEnoughData ? (
        <>
          {/* ── Aggregate score + category averages ── */}
          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            <Card className="p-7" elevated>
              <p className="eyebrow mb-3">Average resident trust</p>
              <TrustScore score={intel.averageTrustScore ?? 0} sampleSize={intel.totalReviews ?? 0} />
              <p className="mt-5 t-helper">
                Averaged across {intel.scoredPropertyCount}{' '}
                {intel.scoredPropertyCount === 1 ? 'property' : 'properties'} with enough verified reviews.
              </p>
            </Card>

            <Card className="p-7" elevated>
              <p className="eyebrow mb-4">How this area rates</p>
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
            title="Not enough resident data yet"
            body={
              intel.message ??
              `We're still gathering verified reviews for ${intel.locality.name}. Scores appear once residents share their experiences.`
            }
            action={<LinkButton href="/search" variant="secondary">Browse properties</LinkButton>}
          />
        </div>
      )}

      {/* ── Properties in this locality ── */}
      <div className="mt-10">
        <h2 className="t-section-title text-foreground">Properties in {intel.locality.name}</h2>
        <div className="mt-4">
          {properties.length === 0 ? (
            <EmptyState
              title="No properties listed here yet"
              body="This locality doesn't have any tracked properties right now."
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
