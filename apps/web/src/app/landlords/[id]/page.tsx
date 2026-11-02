import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Building2, MapPin } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import type { LandlordProfile } from '@/lib/types';
import { Badge, Card, EmptyState, Section } from '@/components/ui/primitives';
import { LinkButton } from '@/components/ui/button';
import { TrustScore } from '@/components/trust-score/trust-score';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Landlord profile · RenTrust',
  description: 'See property history and resident-verified feedback for a landlord.',
};

async function getProfile(id: string) {
  try {
    const { data } = await apiFetch<LandlordProfile>(`/landlords/${encodeURIComponent(id)}`);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export default async function LandlordPage({ params }: { params: { id: string } }) {
  const profile = await getProfile(params.id);

  return (
    <Section className="py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="neutral">{profile.landlord.isCompany ? 'Company' : 'Individual landlord'}</Badge>
            <Badge tone="brand">Resident profile</Badge>
          </div>
          <h1 className="t-page-title text-foreground">{profile.landlord.displayName}</h1>
          <p className="mt-2 t-body text-muted-foreground">
            {profile.propertyCount} {profile.propertyCount === 1 ? 'active property' : 'active properties'}
            {' · '}{profile.verifiedReviewCount} residency-verified {profile.verifiedReviewCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>
        <LinkButton href="/search" variant="secondary">Search properties</LinkButton>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.5fr]">
        <Card className="p-6" elevated>
          {profile.hasEnoughData && profile.averageOverall !== null ? (
            <TrustScore score={profile.averageOverall} sampleSize={profile.verifiedReviewCount} />
          ) : (
            <div>
              <p className="t-title3 text-foreground">Not enough verified reviews for a score</p>
              <p className="mt-2 t-callout text-muted-foreground">
                RenTrust shows a landlord score after at least {profile.minimumReviewsForScore} published, residency-verified reviews.
                The count below includes verified reviews only.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="t-title3 text-foreground">Properties linked to this landlord</h2>
          {profile.properties.length ? (
            <ul className="mt-4 divide-y divide-border">
              {profile.properties.map((property) => (
                <li key={property.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link href={`/properties/${property.id}`} className="flex items-center gap-2 t-label text-foreground hover:text-primary">
                      <Building2 className="size-4 shrink-0 text-primary" aria-hidden />
                      <span>{property.displayName}</span>
                    </Link>
                    {(property.localityName || property.cityName) && (
                      <p className="mt-1 flex items-center gap-1.5 t-helper text-muted-foreground">
                        <MapPin className="size-3.5" aria-hidden />
                        {[property.localityName, property.cityName].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <p className="mt-1 t-helper text-muted-foreground">
                      {property.verifiedReviewCount} residency-verified {property.verifiedReviewCount === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                  {property.averageOverall !== null && (
                    <span className="rounded-md border border-border bg-background px-3 py-1.5 t-label tabular text-foreground" aria-label={`Average review score ${property.averageOverall} out of 100`}>
                      {property.averageOverall}<span className="ml-1 t-helper text-muted-foreground">/100</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No active properties listed"
              body="There are no active properties linked to this landlord yet."
            />
          )}
        </Card>
      </div>
    </Section>
  );
}
