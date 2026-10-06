import Link from 'next/link';
import { SearchBar } from '@/components/search-bar';
import { ScoreRing } from '@/components/score-ring';
import { Card } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import type { Locality } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getLocalities(): Promise<Locality[]> {
  try {
    const { data } = await apiFetch<Locality[]>('/localities');
    return data.slice(0, 6);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const localities = await getLocalities();

  return (
    <div>
      {/* Hero — the one authored moment on the page. */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-[32rem] opacity-80"
          style={{
            background:
              'radial-gradient(55% 55% at 50% 0%, rgb(var(--accent) / 0.18), transparent 72%)',
          }}
        />
        <div className="mx-auto max-w-4xl px-5 pb-16 pt-20 text-center sm:pt-28">
          <h1 className="mx-auto max-w-3xl text-balance text-display font-semibold tracking-tight text-ink sm:text-display-lg">
            Know the place before you rent it.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-callout text-ink-secondary">
            Research any property, landlord, PG, or locality with real resident
            experiences and a transparent Resident Trust Score.
          </p>
          <div className="mx-auto mt-9 max-w-2xl animate-fade-rise">
            <SearchBar />
            <p className="mt-3 text-caption text-ink-tertiary">
              Try “Prestige Lakeside”, “HSR Layout”, or a landlord&apos;s name.
            </p>
          </div>
        </div>
      </section>

      {/* Trust score explainer */}
      <section className="mx-auto max-w-6xl px-5 py-10">
        <Card className="grid items-center gap-8 p-8 sm:grid-cols-[auto_1fr] sm:p-12">
          <div className="flex justify-center">
            <ScoreRing score={82} size={160} stroke={14} />
          </div>
          <div>
            <h2 className="text-title2 font-semibold tracking-tight text-ink">
              A score you can actually read
            </h2>
            <p className="mt-3 max-w-prose text-body text-ink-secondary">
              The Resident Trust Score is a transparent, weighted blend of
              management, maintenance, deposit handling, safety, and the real
              living experience — never a black-box number. Every score shows how
              many verified residents it&apos;s based on, so you know how much to
              trust it.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Management', 'Deposit experience', 'Safety', 'Maintenance', 'Noise'].map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-ink/5 px-3 py-1 text-caption text-ink-secondary"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-5 md:grid-cols-3">
          <Step
            title="Research honestly"
            body="Structured reviews from verified residents — not anonymous rants or planted praise."
          />
          <Step
            title="See the full picture"
            body="Common complaints, what residents love, deposit outcomes, and owner responses side by side."
          />
          <Step
            title="Decide with confidence"
            body="Compare properties, read locality sentiment, and save the places you're considering."
          />
        </div>
      </section>

      {/* Localities */}
      {localities.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-10 pb-24">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-title2 font-semibold tracking-tight text-ink">
              Explore localities
            </h2>
            <Link href="/search" className="text-footnote text-accent hover:brightness-110">
              Search all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {localities.map((l) => (
              <Link
                key={l.id}
                href={`/localities/${l.id}`}
                className="group rounded-2xl bg-surface p-6 shadow-card transition-all duration-300 ease-out hover:shadow-raised"
              >
                <p className="text-title3 font-semibold tracking-tight text-ink">{l.name}</p>
                <p className="mt-1 text-footnote text-ink-tertiary">Resident sentiment & trust scores</p>
                <span className="mt-4 inline-flex items-center gap-1 text-footnote text-accent">
                  View intelligence
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Step({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl p-6">
      <h3 className="text-title3 font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-2 text-body text-ink-secondary">{body}</p>
    </div>
  );
}
