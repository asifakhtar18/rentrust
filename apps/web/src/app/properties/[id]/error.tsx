'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/primitives';

export default function PropertyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Section className="py-16">
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center">
        <h1 className="t-title2 text-foreground">This property didn’t load</h1>
        <p className="mt-3 t-body text-muted-foreground">
          We hit a server problem while loading this property. Please try again, or return to search.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link
            href="/search"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 t-label text-foreground transition-colors hover:bg-muted"
          >
            Back to search
          </Link>
        </div>
      </div>
    </Section>
  );
}
