import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Section } from '@/components/ui/primitives';
import { CompareClient } from './compare-client';

export const metadata: Metadata = {
  title: 'Compare properties · RentTrust',
  description: 'Compare up to four properties side by side on trust score and resident-rated categories.',
};

export default function ComparePage() {
  return (
    <Section className="py-10">
      <Suspense fallback={<div className="py-20 t-meta">Loading comparison…</div>}>
        <CompareClient />
      </Suspense>
    </Section>
  );
}
