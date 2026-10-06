import { Suspense } from 'react';
import { ReviewWizard } from './review-wizard';

export const metadata = { title: 'Write a review' };

export default function NewReviewPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <Suspense fallback={<p className="t-meta">Loading…</p>}>
        <ReviewWizard />
      </Suspense>
    </div>
  );
}
