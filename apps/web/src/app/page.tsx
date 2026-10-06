import Link from 'next/link';
import { SearchBar } from '@/components/search-bar';
import { ScoreRing, CategoryBar, scoreBand } from '@/components/score-ring';
import { Reveal } from '@/components/reveal';
import { Badge, Card, LinkButton } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { CATEGORY_LABELS, PROPERTY_TYPE_LABELS } from '@/lib/labels';
import type { Locality, Property, TrustScore } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getLocalities(): Promise<Locality[]> {
  try {
    const { data } = await apiFetch<Locality[]>('/localities');
    return data.slice(0, 5);
  } catch {
    return [];
  }
}

async function getTopProperty(): Promise<{ property: Property; score: TrustScore } | null> {
  try {
    const { data: props } = await apiFetch<Property[]>('/properties?limit=1');
    if (props.length === 0) return null;
    const { data: score } = await apiFetch<TrustScore>(`/properties/${props[0].id}/score`);
    return { property: props[0], score };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [localities, top] = await Promise.all([getLocalities(), getTopProperty()]);

  return (
    <div className="mx-auto max-w-[1400px] px-6">
      {/* ── HERO: split layout, left-aligned. Not centered. ── */}
      <section className="grid min-h-[calc(100dvh-3.5rem)] items-center gap-12 py-16 lg:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <Reveal>
            <Badge tone="accent" className="mb-5">Now live in Bengaluru</Badge>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-4xl font-semibold tracking-tighter text-zinc-50 md:text-5xl lg:text-6xl">
              Know the place
              <br />
              before you rent it.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400">
              Research any property, landlord, or locality with structured
              resident reviews and a transparent trust score.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8 max-w-xl">
              <SearchBar />
            </div>
          </Reveal>
        </div>

        {/* Right side: live score ring from real data */}
        {top && top.score.hasEnoughData && top.score.overall != null && (
          <Reveal delay={0.2} className="hidden lg:block">
            <Card className="w-[320px] p-6" interactive>
              <div className="flex items-center justify-between">
                <div>
                  <p className="truncate text-sm font-medium text-zinc-200">{top.property.displayName}</p>
                  <p className="text-xs text-zinc-500">{PROPERTY_TYPE_LABELS[top.property.propertyType]}</p>
                </div>
                <ScoreRing score={top.score.overall} size={64} stroke={7} label={false} />
              </div>
              <div className="mt-5 space-y-3">
                {Object.entries(top.score.categoryScores).slice(0, 4).map(([key, val]) => (
                  <CategoryBar key={key} label={CATEGORY_LABELS[key] ?? key} score={val.score} />
                ))}
              </div>
              <Link
                href={`/properties/${top.property.id}`}
                className="mt-4 block text-center text-sm text-emerald-400 transition-colors hover:text-emerald-300"
              >
                View full profile →
              </Link>
            </Card>
          </Reveal>
        )}
      </section>

      {/* ── HOW IT WORKS: three-col grid, not centered cards ── */}
      <section className="border-t border-zinc-800/60 py-20">
        <Reveal>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">How it works</h2>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Search honestly',
              body: 'Find any property, landlord, PG, or locality. Our search handles typos and aliases.',
            },
            {
              title: 'Read the full picture',
              body: 'Structured reviews covering management, deposit, safety, and maintenance — not just stars.',
            },
            {
              title: 'Decide with confidence',
              body: 'Compare properties side by side. Every score shows how many residents it is based on.',
            },
          ].map((step, i) => (
            <Reveal key={step.title} delay={i * 0.06}>
              <Card className="p-6">
                <p className="font-mono text-xs text-emerald-500">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-3 text-base font-medium text-zinc-100">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── TRUST SCORE EXPLAINER ── */}
      <section className="border-t border-zinc-800/60 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[auto_1fr]">
          <Reveal>
            <ScoreRing score={82} size={160} stroke={14} />
          </Reveal>
          <Reveal delay={0.05}>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
                A score you can actually read
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
                The Resident Trust Score is a weighted blend of management,
                maintenance, deposit handling, safety, and living experience.
                Every score shows its sample size and confidence, so you know
                how much to trust it. A single review is never presented as
                authoritative.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {Object.values(CATEGORY_LABELS).slice(0, 6).map((c) => (
                  <span key={c} className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-400">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── LOCALITIES ── */}
      {localities.length > 0 && (
        <section className="border-t border-zinc-800/60 py-20">
          <Reveal>
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Explore localities</h2>
              <Link href="/search" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
                Search all →
              </Link>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {localities.map((l, i) => (
              <Reveal key={l.id} delay={i * 0.04}>
                <Link href={`/localities/${l.id}`}>
                  <Card className="group p-5" interactive>
                    <p className="text-base font-medium text-zinc-200 transition-colors group-hover:text-emerald-400">
                      {l.name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">Resident sentiment & trust scores</p>
                  </Card>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="border-t border-zinc-800/60 py-20 pb-28">
        <Reveal>
          <div className="max-w-lg">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
              Rented somewhere? Share it.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Your anonymous review helps the next person make a better decision. It takes 5 minutes.
            </p>
            <div className="mt-6 flex gap-3">
              <LinkButton href="/search" size="lg">Find your property</LinkButton>
              <LinkButton href="/register" variant="secondary" size="lg">Create account</LinkButton>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
