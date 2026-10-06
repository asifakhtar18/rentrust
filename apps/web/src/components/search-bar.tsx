'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/cn';

export function SearchBar({ initial = '', size = 'lg', autoFocus = false }: { initial?: string; size?: 'lg' | 'md'; autoFocus?: boolean }) {
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
        'flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 pr-2 transition-colors duration-200 focus-within:border-emerald-500/50 focus-within:bg-zinc-900',
        size === 'lg' ? 'h-14 pl-4' : 'h-11 pl-3.5',
      )}
    >
      <svg className="size-5 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        placeholder="Search a property, landlord, or locality"
        aria-label="Search"
        className={cn('w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 focus:outline-none', size === 'lg' ? 'text-base' : 'text-sm')}
      />
      <button
        type="submit"
        className={cn(
          'shrink-0 rounded-lg bg-emerald-500 font-medium text-emerald-950 transition-all duration-150 hover:bg-emerald-400 active:scale-95',
          size === 'lg' ? 'h-10 px-4 text-sm' : 'h-8 px-3 text-sm',
        )}
      >
        Search
      </button>
    </form>
  );
}
