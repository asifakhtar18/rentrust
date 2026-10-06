'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Hero/search entry. Submitting routes to /search?q=…. Kept controlled and
 * accessible; the large variant anchors the home hero, the compact one lives in
 * the search page header.
 */
export function SearchBar({
  initial = '',
  size = 'lg',
  autoFocus = false,
}: {
  initial?: string;
  size?: 'lg' | 'md';
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className={cn(
        'group flex items-center gap-3 rounded-full bg-surface shadow-card ring-1 ring-hairline/10',
        'transition-shadow duration-300 ease-out focus-within:shadow-raised',
        size === 'lg' ? 'h-14 px-5' : 'h-11 px-4',
      )}
    >
      <svg
        className="size-5 shrink-0 text-ink-tertiary"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        placeholder="Search a property, landlord, PG, or locality"
        aria-label="Search"
        className={cn(
          'w-full bg-transparent text-ink placeholder:text-ink-tertiary focus:outline-none',
          size === 'lg' ? 'text-callout' : 'text-body',
        )}
      />
      <button
        type="submit"
        className={cn(
          'shrink-0 rounded-full bg-accent font-medium text-accent-ink transition-all duration-200 ease-out active:scale-95',
          size === 'lg' ? 'h-10 px-5 text-footnote' : 'h-8 px-4 text-caption',
        )}
      >
        Search
      </button>
    </form>
  );
}
