import { Suspense } from 'react';
import { ReviewWizard } from './review-wizard';

export const metadata = { title: 'Write a review' };

export default function NewReviewPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <Suspense fallback={<p className="text-footnote text-ink-tertiary">Loading…</p>}>
        <ReviewWizard />
      </Suspense>
    </div>
  );
}
