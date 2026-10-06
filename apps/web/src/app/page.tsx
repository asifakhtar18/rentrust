import Link from 'next/link';
import { MapPin, ShieldCheck, Scale, Star } from 'lucide-react';
import { SearchBar } from '@/components/search/search-bar';
import { TrustScore, CategoryRow, ScorePill } from '@/components/trust-score/trust-score';
import { Badge, Card, Eyebrow, Section } from '@/components/ui/primitives';
import { LinkButton } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { CATEGORY_LABELS, PROPERTY_TYPE_LABELS } from '@/lib/labels';
import type { Locality, Property, TrustScore as TrustScoreT } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getLocalities(): Promise<Locality[]> {
  try {
    return (await apiFetch<Locality[]>('/localities')).data.slice(0, 5);
  } catch {
    return [];
  }
}

async function getDemoProperty(): Promise<{ property: Property; score: TrustScoreT } | null> {
  try {
    const { data: props } = await apiFetch<Property[]>('/properties?limit=6');
    for (const p of props) {
      const { data: score } = await apiFetch<TrustScoreT>(`/properties/${p.id}/score`);
      if (score.hasEnoughData && score.overall != null) return { property: p, score };
    }
    return null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [localities, demo] = await Promise.all([getLocalities(), getDemoProperty()]);

  return (
    <>
      {/* ── HERO: Apple pattern — centered headline + subhead, product below. ── */}
      <Section className="pt-20 text-center lg:pt-28">
        <p className="eyebrow">The trust layer for renting</p>
        <h1 className="t-display mx-auto mt-3 max-w-3xl text-foreground">
          Know the place
          <br />
          before you rent.
        </h1>
        <p className="mx-auto mt-5 max-w-xl t-body text-muted-foreground">
          Real resident experiences, property intelligence and transparent
          trust scores — so you know what you&apos;re signing up for before you
          move in.
        </p>
        <div className="mx-auto mt-9 max-w-xl">
          <SearchBar />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 t-meta">
          <span>Popular:</span>
          {localities.slice(0, 3).map((l) => (
            <Link key={l.id} href={`/localities/${l.id}`} className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
              {l.name}
            </Link>
          ))}
        </div>

        {/* The product itself is the hero visual — real property + trust score. */}
        <div className="mx-auto mt-16 max-w-md">
          {demo ? (
            <DemoCard property={demo.property} score={demo.score} />
          ) : (
            <Card className="p-8 text-left" elevated>
              <p className="t-callout text-muted-foreground">
                Property intelligence appears here as residents contribute reviews.
              </p>
            </Card>
          )}
        </div>
      </Section>

      {/* ── PROBLEM STATEMENT — editorial, not cards ── */}
      <Section className="border-t border-border py-20">
        <div className="max-w-3xl">
          <h2 className="t-page-title text-foreground">
            Listings tell you the rent.
            <span className="text-muted-foreground"> They don&apos;t tell you what it&apos;s like to live there.</span>
          </h2>
          <p className="mt-5 max-w-xl t-body text-muted-foreground">
            Deposit disputes, slow maintenance, unresponsive management — the
            things that actually matter are invisible until you&apos;ve moved in.
            RentTrust surfaces them before you commit.
          </p>
        </div>
      </Section>

      {/* ── HOW IT WORKS — three signals, editorial grid ── */}
      <Section className="border-t border-border py-20">
        <div className="grid gap-10 md:grid-cols-3">
          <Feature
            icon={<ShieldCheck className="size-5 text-primary" />}
            title="Transparent trust scores"
            body="A weighted score across management, maintenance, deposit, and safety — always shown with its sample size."
          />
          <Feature
            icon={<Star className="size-5 text-primary" />}
            title="Verified resident reviews"
            body="Structured experiences from people who actually lived there. Anonymous in public, verified behind the scenes."
          />
          <Feature
            icon={<Scale className="size-5 text-primary" />}
            title="Side-by-side comparison"
            body="Put properties next to each other on the dimensions that decide where you'll be happy."
          />
        </div>
      </Section>

      {/* ── TRUST SCORE EXPLANATION ── */}
      <Section className="border-t border-border py-20">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <Eyebrow>How the score works</Eyebrow>
            <h2 className="mt-4 t-page-title text-foreground">
              A score you can actually trust
            </h2>
            <p className="mt-5 max-w-md t-body text-muted-foreground">
              Every trust score is a weighted blend of what residents reported,
              not an opaque rating. It always shows how many verified experiences
              it&apos;s based on — a property with three reviews is never presented
              like one with three hundred.
            </p>
          </div>
          <Card className="p-7" elevated>
            <TrustScore score={82} sampleSize={126} />
            <div className="mt-6 space-y-3 border-t border-border pt-6">
              <CategoryRow label="Management" score={85} />
              <CategoryRow label="Maintenance" score={88} />
              <CategoryRow label="Safety" score={90} />
              <CategoryRow label="Deposit" score={71} />
              <CategoryRow label="Communication" score={83} />
            </div>
            <p className="mt-5 text-[13px] text-muted-foreground">Illustrative breakdown of score composition.</p>
          </Card>
        </div>
      </Section>

      {/* ── LOCALITIES — real data ── */}
      {localities.length > 0 && (
        <Section className="border-t border-border py-20">
          <div className="flex items-baseline justify-between">
            <h2 className="t-page-title text-foreground">Explore localities</h2>
            <Link href="/search" className="text-[14px] text-muted-foreground transition-colors hover:text-primary">
              Browse all →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {localities.map((l) => (
              <Link key={l.id} href={`/localities/${l.id}`}>
                <Card className="group flex items-center gap-3 p-5" interactive>
                  <span className="flex size-9 items-center justify-center rounded-md bg-primary/10">
                    <MapPin className="size-4 text-primary" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[14px] font-medium text-foreground group-hover:text-primary">{l.name}</p>
                    <p className="text-[13px] text-muted-foreground">Resident sentiment & scores</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* ── CTA ── */}
      <Section className="border-t border-border py-20">
        <Card className="flex flex-col items-start gap-6 bg-primary p-10 md:flex-row md:items-center md:justify-between" elevated>
          <div className="max-w-md">
            <h2 className="t-section-title text-white">Rented somewhere? Share it.</h2>
            <p className="mt-2 text-[14px] text-white/80">
              Your anonymous review helps the next person decide. It takes about five minutes.
            </p>
          </div>
          <div className="flex gap-3">
            <LinkButton href="/search" variant="secondary" size="lg">Find your property</LinkButton>
          </div>
        </Card>
      </Section>
    </>
  );
}

/* ── Hero demo card: the product UI as the hero visual ── */
function DemoCard({ property, score }: { property: Property; score: { overall: number | null; sampleSize: number; categoryScores: Record<string, { score: number }> } }) {
  const cats = Object.entries(score.categoryScores).slice(0, 4);
  return (
    <Card className="overflow-hidden" elevated>
      <div className="border-b border-border bg-muted/40 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Badge tone="brand" className="mb-2">{PROPERTY_TYPE_LABELS[property.propertyType]}</Badge>
            <p className="truncate t-section-title text-foreground">{property.displayName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden /> Bengaluru
            </p>
          </div>
          {score.overall != null && <ScorePill score={score.overall} />}
        </div>
      </div>
      <div className="px-6 py-5">
        {score.overall != null && <TrustScore score={score.overall} sampleSize={score.sampleSize} size="md" />}
        <div className="mt-5 space-y-2.5">
          {cats.map(([key, v]) => (
            <CategoryRow key={key} label={CATEGORY_LABELS[key] ?? key} score={v.score} />
          ))}
        </div>
        <Link
          href={`/properties/${property.id}`}
          className="mt-5 inline-block text-[14px] font-medium text-primary transition-colors hover:text-primary-hover"
        >
          View full profile →
        </Link>
      </div>
    </Card>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-card">{icon}</span>
      <h3 className="mt-4 t-section-title text-foreground">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
