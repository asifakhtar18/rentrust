'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  MessageSquareText,
  Pin,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { LinkButton } from '@/components/ui/button';

export function HomeMemberPanel() {
  const { user } = useAuth();
  const firstName = user?.displayName?.trim().split(/\s+/)[0];

  return (
    <section
      aria-labelledby="community-nudge-title"
      className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 sm:py-7"
    >
      <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-card p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-20 size-56 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">
              <Sparkles className="size-3.5" aria-hidden />
              {firstName ? `A note for ${firstName}` : 'Local knowledge, shared'}
            </p>
            <h2 id="community-nudge-title" className="mt-2 t-section-title text-foreground">
              Help the next renter look beyond the listing.
            </h2>
            <p className="mt-2 max-w-xl t-meta">
              Add a home you know, share what living there was like, or put a missing neighbourhood on the map. Reviews appear under an anonymous alias; suggestions are checked before they go live.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 t-helper">
              <span className="inline-flex items-center gap-1.5"><Pin className="size-3.5 text-accent" aria-hidden /> You share</span>
              <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" aria-hidden /> We check</span>
              <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
              <span>Renters decide with more context</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
            <LinkButton href="/properties/suggest" size="md" className="w-full sm:w-auto">
              <Building2 className="size-4" aria-hidden />
              Suggest a property
              <ArrowRight className="size-4 nudge-arrow" aria-hidden />
            </LinkButton>
            <LinkButton href="/search" variant="secondary" size="md" className="w-full sm:w-auto">
              <MessageSquareText className="size-4" aria-hidden />
              Find a place to review
            </LinkButton>
            <Link
              href="/locations/suggest"
              className="inline-flex min-h-9 items-center gap-1.5 t-helper font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
            >
              Add a missing neighbourhood <ArrowRight className="size-3.5 nudge-arrow" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
