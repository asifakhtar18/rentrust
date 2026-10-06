import type { Metadata } from 'next';
import { UserRound } from 'lucide-react';
import { Badge, Card, Section } from '@/components/ui/primitives';
import { LinkButton } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Landlord profile · RentTrust',
  description: 'Landlord profiles aggregate verified resident experience across their properties.',
};

/*
 * Landlord profile — honest stub.
 *
 * There is no public landlord-profile API yet (landlords are only exposed
 * through search hits and the admin console). Rather than fabricate a name or
 * score, this page is transparent about what's coming and points residents to
 * the data that does exist: per-property trust scores.
 */
export default function LandlordPage() {
  return (
    <Section className="py-16">
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="size-7" aria-hidden />
        </span>
        <Badge tone="neutral" className="mt-5">
          Coming soon
        </Badge>
        <h1 className="mt-4 t-page-title text-foreground">Landlord profiles are on the way</h1>
        <p className="mx-auto mt-3 max-w-md t-body text-muted-foreground">
          We&apos;re building a view that rolls up a landlord&apos;s track record across every property they manage —
          using only verified resident reviews, never estimated numbers. For now, trust data lives on each property.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <LinkButton href="/search" variant="primary">
            Search properties
          </LinkButton>
          <LinkButton href="/" variant="secondary">
            Back home
          </LinkButton>
        </div>

        <Card className="mt-10 p-6 text-left">
          <p className="t-label text-foreground">Why we don&apos;t show a number here yet</p>
          <p className="mt-2 t-helper">
            A landlord score is only meaningful once enough of their properties have verified reviews. Showing an
            incomplete figure would mislead, so we wait until the data is honest.
          </p>
        </Card>
      </div>
    </Section>
  );
}
