'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Building2, UserRound } from 'lucide-react';
import { apiFetch, qs } from '@/lib/api';
import type { SearchHit } from '@/lib/types';
import { cn } from '@/lib/cn';

const icon = { property: Building2, locality: MapPin, landlord: UserRound } as const;

export function SearchBar({ initial = '', size = 'lg', autoFocus = false }: { initial?: string; size?: 'lg' | 'md'; autoFocus?: boolean }) {
  const router = useRouter();
  const root = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState(initial);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setOpen(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      apiFetch<SearchHit[]>(`/search${qs({ q: term, limit: 6 })}`, { signal: controller.signal })
        .then(({ data }) => { setHits(data); setOpen(true); setActive(-1); })
        .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === 'AbortError')) setHits([]); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [q]);

  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);

  function choose(hit: SearchHit) {
    setOpen(false);
    const path = hit.type === 'property' ? `/properties/${hit.id}` : hit.type === 'locality' ? `/localities/${hit.id}` : `/landlords/${hit.id}`;
    router.push(path);
  }

  return (
    <form ref={root} role="search" onSubmit={(e) => { e.preventDefault(); if (active >= 0 && hits[active]) choose(hits[active]); else if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`); }} className={cn('relative flex items-center gap-3 rounded-lg border border-border bg-card pr-2 shadow-sm transition-colors focus-within:border-primary', size === 'lg' ? 'h-14 pl-4' : 'h-11 pl-3.5')}>
      <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => hits.length > 0 && setOpen(true)} onKeyDown={(e) => {
        if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); setOpen(true); setActive((v) => (v + 1) % hits.length); }
        if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); setActive((v) => (v <= 0 ? hits.length - 1 : v - 1)); }
        if (e.key === 'Escape') setOpen(false);
      }} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open && hits.length > 0} aria-controls="search-suggestions" aria-activedescendant={active >= 0 ? `search-hit-${active}` : undefined} // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus} placeholder="Property, landlord, or locality" aria-label="Search" className={cn('w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none', size === 'lg' ? 't-body' : 'text-[14px]')} />
      <button type="submit" className={cn('shrink-0 rounded-md bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary-hover active:scale-95', size === 'lg' ? 'h-10 px-5 text-[14px]' : 'h-8 px-3.5 text-[14px]')}>Search</button>
      {open && hits.length > 0 && <ul id="search-suggestions" role="listbox" aria-label="Search suggestions" className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-xl">
        {hits.map((hit, index) => { const Icon = icon[hit.type as keyof typeof icon] ?? Search; return <li key={`${hit.type}:${hit.id}`} id={`search-hit-${index}`} role="option" aria-selected={active === index}>
          <button type="button" onMouseEnter={() => setActive(index)} onClick={() => choose(hit)} className={cn('flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left', active === index ? 'bg-muted' : 'hover:bg-muted/70')}>
            <Icon className="size-4 shrink-0 text-primary" aria-hidden /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{hit.title}</span>{hit.subtitle && <span className="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>}</span><span className="text-[10px] uppercase tracking-wider text-muted-foreground">{hit.type}</span>
          </button>
        </li>; })}
      </ul>}
      {open && q.trim().length >= 2 && hits.length === 0 && !loading && <div role="status" className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-xl">No close matches yet. Press Search to see all results.</div>}
    </form>
  );
}
