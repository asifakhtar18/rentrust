import type { ReactNode } from 'react';
import { Section } from '@/components/ui/primitives';

/*
 * Shared layout for long-form policy / content pages. Keeps the reading
 * measure comfortable and applies consistent Apple typography to prose.
 */
export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <Section className="py-14">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 t-page-title text-foreground">{title}</h1>
        <p className="mt-2 t-meta">Last updated {updated}</p>
        <div className="legal-prose mt-8">{children}</div>
      </div>
    </Section>
  );
}
