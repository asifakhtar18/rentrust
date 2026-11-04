'use client';

import Link from 'next/link';
import { ArrowUpRight, HeartHandshake, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function HomeMemberPanel() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <section className="mx-auto max-w-[1200px] px-5 py-5 sm:px-8 lg:px-12">
    <div className="flex flex-col gap-4 rounded-xl border border-accent/25 bg-accent/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-start gap-3"><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"><Sparkles className="size-4" aria-hidden /></span><div><p className="t-label text-foreground">{user ? `Welcome back${user.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}!` : 'Good neighbourhoods are built together.'}</p><p className="mt-1 t-meta">{user ? 'Pick up where you left off or add a neighbourhood you know.' : 'Find a place, compare real resident notes, and help the next renter.'}</p></div></div>
      <Link href={user ? '/locations/suggest' : '/register'} className="inline-flex shrink-0 items-center gap-2 t-label text-primary hover:underline">{user ? <><HeartHandshake className="size-4" aria-hidden />Suggest a locality</> : <>Join the community<ArrowUpRight className="size-4" aria-hidden /></>}</Link>
    </div>
  </section>;
}
