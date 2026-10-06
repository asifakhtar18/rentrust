import Link from 'next/link';
import { SearchBar } from '@/components/search-bar';
import { ScoreRing } from '@/components/score-ring';
import { TiltCard } from '@/components/tilt-card';
import { Badge, LinkButton } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import type { Locality, Property, TrustScore } from '@/lib/types';
import { PROPERTY_TYPE_LABELS } from '@/lib/labels';

export const dynamic = 'force-dynamic';

async function getLocalities(): Promise<Locality[]> {
  try {
    const { data } = await apiFetch<Locality[]>('/localities');
    return data.slice(0, 6);
  } catch {
    return [];
  }
}

async function getFeaturedProperties(): Promise<Array<Property & { score: TrustScore }>> {
  try {
    const { data: props } = await apiFetch<Property[]>('/properties?limit=4');
    const withScores = await Promise.all(
      props.map(async (p) => {
        try {
          const { data: score } = await apiFetch<TrustScore>(`/properties/${p.id}/score`);
          return { ...p, score };
        } catch {
          return { ...p, score: { hasEnoughData: false, overall: null } as TrustScore };
        }
      }),
    );
    return withScores;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [localities, featured] = await Promise.all([getLocalities(), getFeaturedProperties()]);

  return (
    <div className="relative z-[2]">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-5 pb-16 pt-16 sm:pt-24">
      {/* Floating shapes for character and depth */}
        <FloatingShapes />

        <div className="mx-auto max-w-5xl text-center">
          <Badge
            tone="accent"
            className="mb-6 animate-pop-in border border-accent/20 bg-accent/10 px-4 py-1.5 text-caption"
          >
            ✦ Real reviews from real residents
          </Badge>

          <h1 className="mx-auto max-w-3xl font-display text-display font-bold tracking-tight sm:text-display-lg lg:text-hero">
            Know the place
            <br />
            <span className="text-gradient">before you rent it.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-callout text-ink-secondary">
            Research any property, landlord, PG, or locality with structured
            resident experiences and a transparent trust score.
          </p>

          <div className="mx-auto mt-10 max-w-2xl animate-fade-rise [animation-delay:0.2s]">
            <SearchBar />
            <p className="mt-3 text-caption text-ink-tertiary">
              Try a property name, locality, or landlord.
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURED PROPERTIES (real data) ── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <SectionHeader title="Properties people are researching" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p, i) => (
              <Link href={`/properties/${p.id}`} key={p.id}>
                <TiltCard
                  className="glass-card p-5"
                >
                  <div className="animate-pop-in" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="flex items-center justify-between">
                      <span className="pill rounded-full px-2.5 py-1 text-caption text-ink-secondary">
                        {PROPERTY_TYPE_LABELS[p.propertyType] ?? p.propertyType}
                      </span>
                      {p.score.hasEnoughData && p.score.overall != null && (
                        <ScoreRing score={p.score.overall} size={48} stroke={5} label={false} />
                      )}
                    </div>
                    <p className="mt-4 truncate font-display text-title3 text-ink">
                      {p.displayName}
                    </p>
                    <p className="mt-1 truncate text-footnote text-ink-tertiary">
                      {p.developer ?? 'Bengaluru'}
                      {p.score.hasEnoughData && p.score.overall != null && (
                        <span className="ml-2 text-accent tabular">{p.score.overall}/100</span>
                      )}
                    </p>
                  </div>
                </TiltCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS — bold, numbered ── */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <SectionHeader title="How RentTrust works" />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              num: '01',
              color: 'text-accent',
              title: 'Search honestly',
              body: 'Find any property, landlord, PG, or locality in Bengaluru.',
            },
            {
              num: '02',
              color: 'text-silver',
              title: 'See the full picture',
              body: 'Structured reviews, deposit outcomes, safety, management — not just a star rating.',
            },
            {
              num: '03',
              color: 'text-ink-tertiary',
              title: 'Decide with confidence',
              body: 'Compare properties, read locality intelligence, save what you like.',
            },
          ].map((step) => (
            <TiltCard key={step.num} className="glass-card p-6" intensity={6}>
              <span className={`font-display text-display font-bold ${step.color} opacity-40`}>
                {step.num}
              </span>
              <h3 className="mt-2 font-display text-title3 text-ink">{step.title}</h3>
              <p className="mt-2 text-body text-ink-secondary">{step.body}</p>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* ── TRUST SCORE EXPLAINER — the hero ring ── */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <TiltCard className="glass-card grid items-center gap-8 p-8 sm:grid-cols-[auto_1fr] sm:p-12" intensity={4}>
          <div className="flex justify-center">
            <div className="relative">
              <ScoreRing score={82} size={180} stroke={16} />
              <div
                aria-hidden
                className="absolute -inset-6 -z-10 animate-drift rounded-full opacity-40"
                style={{
                  background:
                    'radial-gradient(circle, rgb(var(--accent) / 0.3), transparent 70%)',
                }}
              />
            </div>
          </div>
          <div>
            <h2 className="font-display text-title1 text-ink">
              A score you can <span className="text-gradient">actually read</span>
            </h2>
            <p className="mt-4 max-w-prose text-body text-ink-secondary">
              The Resident Trust Score is a transparent, weighted blend of
              management, maintenance, deposit handling, safety, and the real
              living experience — never a black-box number. Every score shows
              how many verified residents it&apos;s based on.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Management', 'Deposit', 'Safety', 'Maintenance', 'Noise', 'Rules'].map((c) => (
                <span key={c} className="pill rounded-full px-3 py-1.5 text-caption text-ink-secondary">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </TiltCard>
      </section>

      {/* ── LOCALITIES MARQUEE ── */}
      {localities.length > 0 && (
        <section className="relative overflow-hidden py-10">
          <SectionHeader title="Explore localities" className="mx-auto max-w-5xl px-5 pb-4" />
          <div className="relative whitespace-nowrap">
            <div className="inline-flex animate-marquee gap-4 py-2 pr-4">
              {[...localities, ...localities].map((l, i) => (
                <Link
                  key={`${l.id}-${i}`}
                  href={`/localities/${l.id}`}
                  className="glass-card group inline-block rounded-2xl px-8 py-5 transition-all duration-300 ease-out hover:shadow-glow"
                >
                  <p className="font-display text-title3 text-ink transition-colors group-hover:text-accent">
                    {l.name}
                  </p>
                  <p className="mt-1 text-caption text-ink-tertiary">
                    Resident sentiment & trust scores →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="mx-auto max-w-3xl px-5 pb-24 pt-8 text-center">
        <h2 className="font-display text-title1 text-ink">
          Rented somewhere? <span className="text-gradient">Share it.</span>
        </h2>
        <p className="mt-3 text-callout text-ink-secondary">
          Your anonymous review helps the next person make a better decision.
          It takes 5 minutes.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <LinkButton href="/search" variant="primary" size="lg">
            Find your property
          </LinkButton>
          <LinkButton href="/register" variant="secondary" size="lg">
            Create account
          </LinkButton>
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ── */

function SectionHeader({ title, className }: { title: string; className?: string }) {
  return (
    <div className={className}>
      <h2 className="font-display text-title2 text-ink">{title}</h2>
    </div>
  );
}

/**
 * Floating geometric SVG shapes behind the hero — purely decorative abstract
 * art that gives the page character and dimensional depth without using images.
 * Animated with CSS (transform+opacity only = GPU composited).
 */
function FloatingShapes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Triangle */}
      <svg
        className="absolute left-[8%] top-[12%] size-16 animate-float text-accent/15 [animation-delay:0s]"
        viewBox="0 0 80 80"
        fill="none"
      >
        <path d="M40 8 72 68H8Z" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      {/* Circle */}
      <svg
        className="absolute right-[12%] top-[20%] size-12 animate-float text-silver/20 [animation-delay:1.5s]"
        viewBox="0 0 60 60"
        fill="none"
      >
        <circle cx="30" cy="30" r="26" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      {/* Diamond */}
      <svg
        className="absolute bottom-[25%] left-[15%] size-10 animate-float text-ink-tertiary/20 [animation-delay:3s]"
        viewBox="0 0 50 50"
        fill="none"
      >
        <rect x="7" y="7" width="36" height="36" rx="3" stroke="currentColor" strokeWidth="2.5" transform="rotate(45 25 25)" />
      </svg>
      {/* Cross */}
      <svg
        className="absolute bottom-[30%] right-[10%] size-8 animate-float text-accent/12 [animation-delay:2s]"
        viewBox="0 0 40 40"
        fill="none"
      >
        <path d="M20 6v28M6 20h28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {/* Large soft circle — atmospheric */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-drift"
        style={{
          width: '36rem',
          height: '36rem',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgb(var(--accent) / 0.06), transparent 55%)',
        }}
      />
    </div>
  );
}
