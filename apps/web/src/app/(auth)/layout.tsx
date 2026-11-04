import Link from 'next/link';
import { ArrowUpRight, KeyRound, MessageSquareText, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[1320px] items-center px-3 py-3 sm:px-6 lg:py-12">
      <div className="grid w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[0_28px_80px_-54px_rgba(26,54,47,.58)] lg:min-h-[660px] lg:grid-cols-[1.02fr_.98fr]">
        <aside className="relative flex min-h-[112px] flex-col justify-center overflow-hidden bg-primary px-5 py-4 text-primary-foreground sm:min-h-[145px] sm:px-8 sm:py-6 lg:min-h-full lg:justify-between lg:px-12 lg:py-11">
          <div className="absolute -right-16 -top-20 size-64 rounded-full border border-white/10" aria-hidden />
          <div className="absolute -right-5 -top-9 size-44 rounded-full border border-white/10" aria-hidden />
          <div className="relative z-10">
            <Link href="/" className="hidden items-center gap-2.5 rounded-sm lg:inline-flex">
              <span className="flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10"><ShieldCheck className="size-4" aria-hidden /></span>
              <span className="font-serif text-xl tracking-tight">RenTrust</span>
            </Link>
            <p className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/[.08] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.16em] text-primary-foreground/85 lg:mt-7 lg:inline-flex lg:text-[10px]">
              <span className="size-1.5 rounded-full bg-[#efb28d]" aria-hidden /> Resident-first renting
            </p>
            <h2 className="max-w-lg font-serif text-[clamp(1.65rem,4.2vw,3.8rem)] leading-[1.03] tracking-[-.045em] lg:mt-5">
              <span className="lg:hidden">Choose your next home with </span><span className="hidden lg:inline">Make the move with </span><em className="text-[#f1c5a1]">more certainty.</em>
            </h2>
            <p className="mt-4 hidden max-w-md text-sm leading-relaxed text-primary-foreground/75 sm:text-base lg:block">
              Read what life in a place is really like, then choose your next home with your eyes open.
            </p>
          </div>

          <AuthIllustration />

          <div className="relative z-10 mt-7 hidden gap-2 sm:grid-cols-2 lg:mt-0 lg:grid">
            <TrustNote icon={<MessageSquareText />} title="Real resident voices" text="Structured stories, with room for context." />
            <TrustNote icon={<KeyRound />} title="Private by design" text="Your name stays off public reviews." />
          </div>
          <div className="relative z-10 mt-7 hidden items-center gap-2 border-t border-white/15 pt-4 text-xs text-primary-foreground/60 lg:flex">
            <ShieldCheck className="size-3.5" aria-hidden /> Private identity. Public accountability.
          </div>
          <div className="pointer-events-none absolute -bottom-12 -right-8 font-serif text-[260px] leading-none text-white/[.035]" aria-hidden>R</div>
        </aside>

        <section className="flex flex-col justify-center px-5 py-5 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3 sm:mb-8 sm:pb-4">
            <span className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Your RenTrust account</span>
            <Link href="/search" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline hover:underline-offset-4">Browse first <ArrowUpRight className="size-3.5" aria-hidden /></Link>
          </div>
          {children}
          <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground sm:mt-9">
            Need a hand? <Link className="text-primary underline-offset-4 hover:underline" href="/guidelines">Visit the community guide</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}

function TrustNote({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/15 bg-white/[.07] p-3.5">
      <span className="mt-0.5 text-[#f1c5a1]">{icon}</span>
      <div><p className="text-xs font-semibold">{title}</p><p className="mt-1 text-[11px] leading-relaxed text-primary-foreground/65">{text}</p></div>
    </div>
  );
}

function AuthIllustration() {
  return (
    <div className="relative mt-7 hidden max-w-[430px] lg:block" aria-hidden="true">
      <svg viewBox="0 0 440 205" className="h-auto w-full">
        <path d="M9 177H428" stroke="white" strokeOpacity=".25" />
        <path d="M61 177V89L196 26L332 89V177" fill="#f2ead9" fillOpacity=".96" stroke="#f2ead9" strokeWidth="2" />
        <path d="M47 90L196 18L346 90" fill="none" stroke="#eab993" strokeWidth="5" strokeLinejoin="round" />
        <path d="M80 98H310M80 143H310" stroke="#31564c" strokeWidth="3" />
        <g fill="#89aaa0" stroke="#31564c" strokeWidth="2">
          <rect x="88" y="103" width="34" height="31"/><rect x="143" y="103" width="34" height="31"/><rect x="214" y="103" width="34" height="31"/><rect x="269" y="103" width="34" height="31"/>
          <rect x="88" y="148" width="34" height="29"/><rect x="143" y="148" width="34" height="29"/><rect x="214" y="148" width="34" height="29"/><rect x="269" y="148" width="34" height="29"/>
        </g>
        <path d="M184 142H208V177H184Z" fill="#c97b56" stroke="#31564c" strokeWidth="2" />
        <path d="M20 177V145M20 151C-1 143 3 126 14 126C26 129 28 145 20 151ZM20 161C37 151 47 162 40 171C34 177 26 173 20 161ZM20 158C2 158 -1 170 6 177" fill="#5c8368" stroke="#dce2cd" strokeWidth="2" />
        <path d="M362 177V143M362 150C341 145 342 128 354 127C366 130 370 142 362 150ZM362 162C379 151 391 160 385 171C379 178 369 173 362 162Z" fill="#5c8368" stroke="#dce2cd" strokeWidth="2" />
        <path d="M332 122H405M332 128H405" stroke="#eab993" strokeWidth="2" strokeDasharray="3 5" />
      </svg>
      <span className="absolute -right-2 top-4 rotate-3 rounded-sm bg-[#f6e5cf] px-3 py-2 font-mono text-[9px] uppercase tracking-[.14em] text-[#31564c] shadow-lg">Know your next door</span>
    </div>
  );
}
