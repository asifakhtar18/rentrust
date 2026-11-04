import Link from 'next/link';
import { ArrowRight, BadgeCheck, Building2, ClipboardCheck, MapPin, MessageSquareText, Scale, ShieldCheck } from 'lucide-react';
import { SearchBar } from '@/components/search/search-bar';
import { NearbyProperties } from '@/components/search/nearby-properties';
import { HomeMemberPanel } from '@/components/home/member-panel';
import { Card, Eyebrow, Section } from '@/components/ui/primitives';
import { LinkButton } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import type { Locality } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getLocalities(): Promise<Locality[]> {
  try {
    return (await apiFetch<Locality[]>('/localities')).data.slice(0, 5);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const localities = await getLocalities();

  return (
    <>
      <Section className="grid items-center gap-12 pb-16 pt-14 sm:pt-20 lg:min-h-[680px] lg:grid-cols-[0.94fr_1.06fr] lg:gap-8 lg:pb-24 lg:pt-16">
        <div className="reveal relative z-10">
          <Eyebrow>Renting, with the lights on</Eyebrow>
          <h1 className="t-display mt-6 max-w-[670px] text-foreground">
            Know the home<br />behind the <em className="text-primary">listing.</em>
          </h1>
          <p className="mt-6 max-w-[510px] t-body text-muted-foreground">
            Honest experiences from people who have lived there. Get a clearer picture of the building, the management, and the details a listing leaves out.
          </p>
          <div className="mt-8 max-w-[560px]"><SearchBar /></div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 t-meta">
            <span className="font-semibold text-foreground">Explore nearby</span>
            {localities.slice(0, 3).map((locality) => (
              <Link key={locality.id} href={`/localities/${locality.id}`} className="underline decoration-border underline-offset-4 transition-colors hover:text-primary">
                {locality.name}
              </Link>
            ))}
            {localities.length === 0 && <Link href="/search" className="underline decoration-border underline-offset-4 hover:text-primary">Search all areas</Link>}
          </div>
          <div className="mt-8 flex items-start gap-3 border-l-2 border-accent pl-4">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p className="max-w-md t-meta">Residents stay anonymous in public. Verification documents are reviewed privately and never appear on a property page.</p>
          </div>
        </div>

        <NeighbourhoodIllustration />
      </Section>

      <HomeMemberPanel />
      <NearbyProperties />

      <Section className="border-y border-border py-6">
        <div className="grid gap-5 md:grid-cols-3 md:gap-0">
          <Promise icon={<Building2 />} title="Find the place" text="Search homes, PGs, landlords, and localities." />
          <Promise icon={<MessageSquareText />} title="Hear from residents" text="Read first-hand experiences with context and moderation." />
          <Promise icon={<Scale />} title="Compare what matters" text="Look at the same living details across your shortlist." />
        </div>
      </Section>

      <Section className="grid gap-10 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-28">
        <div>
          <Eyebrow>Not just the brochure</Eyebrow>
          <h2 className="mt-5 t-page-title max-w-lg">A good place is more than a good photograph.</h2>
          <p className="mt-5 max-w-md t-body text-muted-foreground">A deposit policy. A lift that works. Someone who answers when the tap leaks. We organise resident feedback around the parts of renting that shape everyday life.</p>
          <Link href="/guidelines" className="mt-6 inline-flex items-center gap-2 t-label text-primary hover:underline hover:underline-offset-4">
            How reviews are handled <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Signal number="01" title="Maintenance" text="How quickly were everyday problems handled?" />
          <Signal number="02" title="Deposit" text="Was the move-out process clear and fair?" />
          <Signal number="03" title="Management" text="Could residents get a useful response?" />
          <Signal number="04" title="Living experience" text="What should a future neighbour know?" />
          <p className="sm:col-span-2 t-helper">Scores appear only when there is enough verified feedback. Each profile shows the review count behind its score.</p>
        </div>
      </Section>

      {localities.length > 0 && (
        <Section className="border-t border-border py-16 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><Eyebrow>Start close to home</Eyebrow><h2 className="mt-4 t-page-title">Browse a locality</h2></div>
            <Link href="/search" className="inline-flex items-center gap-2 t-label text-primary hover:underline hover:underline-offset-4">All locations <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {localities.map((locality, index) => (
              <Link key={locality.id} href={`/localities/${locality.id}`}>
                <Card interactive className="group flex min-h-[116px] items-end justify-between overflow-hidden p-5">
                  <div><span className="t-helper">AREA 0{index + 1}</span><p className="mt-1 t-title3 text-foreground group-hover:text-primary">{locality.name}</p></div>
                  <MapPin className="mb-1 size-4 text-accent" aria-hidden />
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section className="pb-20 pt-4 lg:pb-28">
        <div className="relative overflow-hidden rounded-xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-12">
          <div className="relative z-10 flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
            <div className="max-w-xl">
              <p className="eyebrow !text-primary-foreground before:!bg-accent">For the next person looking</p>
              <h2 className="mt-4 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">Lived there? Your experience can help someone choose well.</h2>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-primary-foreground/75">Reviews are anonymous in public and go through moderation before they appear.</p>
            </div>
            <LinkButton href="/search" variant="secondary" size="lg" className="shrink-0 border-transparent bg-background text-foreground hover:bg-background/90">Find your property <ArrowRight className="size-4" aria-hidden /></LinkButton>
          </div>
          <div className="pointer-events-none absolute -bottom-16 -right-4 font-serif text-[240px] leading-none text-white/[0.045]" aria-hidden>R</div>
        </div>
      </Section>
    </>
  );
}

function Promise({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-4 md:px-6 md:first:pl-0 md:last:pr-0 md:[&:not(:last-child)]:border-r md:[&:not(:last-child)]:border-border">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary">{icon}</span>
      <div><h2 className="t-label text-foreground">{title}</h2><p className="mt-1 max-w-xs t-meta">{text}</p></div>
    </div>
  );
}

function Signal({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="border-t border-border py-4">
      <div className="flex items-baseline justify-between gap-4"><h3 className="t-title3 text-foreground">{title}</h3><span className="font-mono text-xs text-accent">{number}</span></div>
      <p className="mt-1 t-meta">{text}</p>
    </div>
  );
}

function NeighbourhoodIllustration() {
  return (
    <div className="reveal reveal-delay relative mx-auto w-full max-w-[650px]">
      <div className="paper-grid relative overflow-hidden rounded-[1.25rem] border border-border bg-[#e8dfcc] p-3 shadow-[0_24px_70px_-48px_rgba(23,51,45,.55)] sm:p-5">
        <div className="relative min-h-[390px] overflow-hidden rounded-[0.9rem] border border-[#c9bea8] bg-[#ede7d9] sm:min-h-[475px]">
          <div className="absolute inset-x-0 top-0 h-1/2 bg-[#d7e0d7]" />
          <div className="absolute -right-10 top-12 size-48 rounded-full bg-[#f0c47f]/35 blur-2xl" />
          <svg viewBox="0 0 640 470" className="absolute inset-0 h-full w-full" role="img" aria-labelledby="building-title building-desc">
            <title id="building-title">A cutaway illustration of an apartment block</title>
            <desc id="building-desc">An inviting neighbourhood building with small balconies, windows, a tree, and a shared courtyard.</desc>
            <path d="M0 357 C110 327 177 373 275 347 C384 318 489 356 640 329 V470 H0Z" fill="#b8c6ac" />
            <path d="M430 175 C461 145 520 147 551 177 C584 209 594 260 585 326 L447 344Z" fill="#56745c" />
            <path d="M499 266 C493 315 501 355 494 385" fill="none" stroke="#765d45" strokeWidth="13" strokeLinecap="round" />
            <path d="M80 391 L113 345 L169 344 L196 391" fill="#c68d5a" />
            <path d="M157 365 L188 327 L235 328 L266 368" fill="#b6754a" />
            <path d="M174 368 L211 367 L211 394 L174 394Z" fill="#5d715d" />
            <rect x="138" y="97" width="338" height="268" rx="5" fill="#f7f2e8" stroke="#35534a" strokeWidth="4" />
            <path d="M119 106 L298 31 L495 106Z" fill="#b96749" stroke="#35534a" strokeWidth="5" strokeLinejoin="round" />
            <path d="M137 107 H477" stroke="#f4d6b5" strokeWidth="7" />
            <rect x="157" y="130" width="302" height="42" fill="#d9d2c3" />
            <rect x="158" y="231" width="302" height="42" fill="#d9d2c3" />
            <path d="M138 211 H476 M138 312 H476" stroke="#35534a" strokeWidth="5" />
            <path d="M138 181 H476 M138 282 H476" stroke="#8a9a83" strokeWidth="3" />
            <g fill="#91b5b2" stroke="#35534a" strokeWidth="3">
              <rect x="172" y="116" width="50" height="58" rx="2"/><rect x="268" y="116" width="50" height="58" rx="2"/><rect x="364" y="116" width="50" height="58" rx="2"/>
              <rect x="172" y="217" width="50" height="58" rx="2"/><rect x="268" y="217" width="50" height="58" rx="2"/><rect x="364" y="217" width="50" height="58" rx="2"/>
            </g>
            <g className="window-light" fill="#f3d995" opacity=".8"><rect x="178" y="122" width="22" height="44"/><rect x="370" y="223" width="22" height="44"/></g>
            <g fill="none" stroke="#35534a" strokeWidth="3"><path d="M165 192 H230 M261 192 H326 M357 192 H422 M165 293 H230 M261 293 H326 M357 293 H422"/><path d="M180 190 V207 M214 190 V207 M276 190 V207 M310 190 V207 M372 190 V207 M406 190 V207 M180 291 V308 M214 291 V308 M276 291 V308 M310 291 V308 M372 291 V308 M406 291 V308"/></g>
            <rect x="281" y="299" width="52" height="66" rx="2" fill="#b96849" stroke="#35534a" strokeWidth="4" />
            <circle cx="320" cy="335" r="3" fill="#f5e9ce" />
            <path d="M0 398 H640" stroke="#7f937b" strokeWidth="3" />
            <path d="M262 398 L284 365 H333 L359 398" fill="#d5c6a7" />
          </svg>
          <div className="absolute left-4 top-4 rounded-full border border-[#c9bea8] bg-[#f7f2e8]/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.17em] text-[#35534a] sm:left-6 sm:top-6">The resident&apos;s view</div>
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-md border border-[#c9bea8] bg-[#f7f2e8]/95 px-3 py-2 text-xs text-[#35534a] sm:bottom-6 sm:left-6">
            <ClipboardCheck className="size-4 text-[#b96849]" aria-hidden /> First-hand. Moderated. Private by design.
          </div>
          <div className="absolute right-4 top-[42%] hidden -rotate-2 rounded-sm bg-[#f7f2e8] px-3 py-2 shadow-md sm:block">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#35534a]"><BadgeCheck className="size-3.5 text-[#b96849]" aria-hidden /> Details beyond the listing</div>
            <div className="mt-1 h-px w-32 bg-[#c9bea8]" />
            <p className="mt-1 font-mono text-[9px] tracking-wide text-[#718177]">A NEIGHBOURHOOD FIELD NOTE</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-2 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[.18em] text-[#718177]"><span>Street-level knowledge</span><span>RenTrust / 01</span></div>
      </div>
      <span className="absolute -right-3 -top-4 hidden size-12 rounded-full border border-accent/50 sm:block" aria-hidden />
    </div>
  );
}
