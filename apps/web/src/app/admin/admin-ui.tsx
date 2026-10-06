'use client';

import { Loader2, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Page header for an admin screen. */
export function AdminHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="t-page-title text-foreground">{title}</h1>
        {description && <p className="mt-1 t-meta">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A bordered panel that wraps dense content (tables, forms). */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-hidden rounded-lg border border-border bg-card', className)}>{children}</div>;
}

export function TableLoading() {
  return (
    <div className="flex items-center gap-2 px-5 py-12 t-meta">
      <Loader2 className="size-4 animate-spin text-primary" /> Loading…
    </div>
  );
}

export function TableError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="px-5 py-10">
      <p className="t-body text-destructive">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 t-label text-primary hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function TableEmpty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="px-5 py-14 text-center">
      <Inbox className="mx-auto size-8 text-muted-foreground" aria-hidden />
      <p className="mt-3 t-label text-foreground">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm t-helper">{body}</p>}
    </div>
  );
}

/** Thin horizontal rule styling for table head cells. */
export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn('px-4 py-2.5 text-left eyebrow', className)}>{children}</th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 align-middle t-body', className)}>{children}</td>;
}

/** Mono-ish short id display. */
export function ShortId({ id }: { id: string }) {
  return <span className="tabular text-[12px] text-muted-foreground">{id.slice(0, 8)}</span>;
}
