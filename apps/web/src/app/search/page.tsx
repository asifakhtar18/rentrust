import { Suspense } from 'react';
import { SearchClient } from './search-client';

export const metadata = { title: 'Search' };

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Suspense fallback={<p className="text-footnote text-ink-tertiary">Loading…</p>}>
        <SearchClient />
      </Suspense>
    </div>
  );
}
