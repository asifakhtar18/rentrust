import { Suspense } from 'react';
import { CompareClient } from './compare-client';

export const metadata = { title: 'Compare properties' };

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-title1 font-semibold tracking-tight text-ink">Compare properties</h1>
      <p className="mt-1 text-callout text-ink-secondary">
        Put two to four properties side by side on their trust scores.
      </p>
      <Suspense fallback={<p className="mt-6 text-footnote text-ink-tertiary">Loading…</p>}>
        <CompareClient />
      </Suspense>
    </div>
  );
}
