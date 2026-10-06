import { Suspense } from 'react';
import { SearchClient } from './search-client';

export const metadata = { title: 'Search' };

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-[840px] px-6 py-10">
      <Suspense fallback={<p className="t-meta">Loading…</p>}>
        <SearchClient />
      </Suspense>
    </div>
  );
}
