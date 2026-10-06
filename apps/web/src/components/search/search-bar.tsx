'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
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
        'flex items-center gap-3 rounded-lg border border-border bg-surface pr-2 shadow-sm transition-colors duration-150 focus-within:border-brand',
        size === 'lg' ? 'h-14 pl-4' : 'h-11 pl-3.5',
      )}
    >
      <Search className="size-5 shrink-0 text-text-tertiary" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        placeholder="Search a property, landlord, or locality"
        aria-label="Search"
        className={cn('w-full bg-transparent text-foreground placeholder:text-text-tertiary focus:outline-none', size === 'lg' ? 'text-body' : 'text-small')}
      />
      <button
        type="submit"
        className={cn(
          'shrink-0 rounded-md bg-brand font-medium text-brand-foreground transition-colors duration-150 hover:bg-brand-hover active:scale-95',
          size === 'lg' ? 'h-10 px-5 text-small' : 'h-8 px-3.5 text-small',
        )}
      >
        Search
      </button>
    </form>
  );
}
