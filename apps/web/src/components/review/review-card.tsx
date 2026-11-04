import { CheckCircle2 } from 'lucide-react';
import type { PublicReview } from '@/lib/types';
import { TENURE_LABELS, humanizeTag } from '@/lib/labels';
import { Badge, Card } from '@/components/ui/primitives';
import { OwnerResponse } from './owner-response';
import { ReportReviewButton } from './report-review-button';

/*
 * Anonymised resident review. Only non-identifying public fields — alias,
 * tenure, date, structured sentiment. Never identity.
 */
export function ReviewCard({ review }: { review: PublicReview }) {
  const date = review.publishedAt ?? review.createdAt;
  return (
    <Card as="article" className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="t-label text-foreground">{review.authorAlias}</span>
        {review.isVerified && (
          <Badge tone="success">
            <CheckCircle2 className="size-3" aria-hidden /> Verified resident
          </Badge>
        )}
        {review.tenure && (
          <span className="t-meta">Stayed {TENURE_LABELS[review.tenure]?.toLowerCase() ?? review.tenure}</span>
        )}
        <span className="ml-auto t-meta">
          {new Date(date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
        </span>
      </div>

      {(review.wouldRecommend != null || review.wouldRentAgain) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.wouldRecommend != null && (
            <Badge tone={review.wouldRecommend ? 'success' : 'danger'}>
              {review.wouldRecommend ? 'Would recommend' : 'Would not recommend'}
            </Badge>
          )}
          {review.wouldRentAgain && <Badge tone="neutral">Rent again: {review.wouldRentAgain.toLowerCase()}</Badge>}
        </div>
      )}

      {review.comments && <p className="mt-3 whitespace-pre-line t-body text-foreground/90">{review.comments}</p>}

      {(review.likedTags.length > 0 || review.dislikedTags.length > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {review.likedTags.length > 0 && (
            <TagGroup title="Liked" tone="success" tags={review.likedTags} text={review.likedText} />
          )}
          {review.dislikedTags.length > 0 && (
            <TagGroup title="Disliked" tone="warning" tags={review.dislikedTags} text={review.dislikedText} />
          )}
        </div>
      )}

      <OwnerResponse reviewId={review.id} />
      <div className="mt-4 flex justify-end border-t border-border pt-3">
        <ReportReviewButton reviewId={review.id} />
      </div>
    </Card>
  );
}

function TagGroup({
  title,
  tone,
  tags,
  text,
}: {
  title: string;
  tone: 'success' | 'warning';
  tags: string[];
  text: string | null;
}) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="mb-2 t-meta font-medium">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Badge key={t} tone={tone}>{humanizeTag(t)}</Badge>
        ))}
      </div>
      {text && <p className="mt-2 t-meta text-foreground/80">“{text}”</p>}
    </div>
  );
}
