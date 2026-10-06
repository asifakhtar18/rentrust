import type { PublicReview } from '@/lib/types';
import { TENURE_LABELS, humanizeTag } from '@/lib/labels';
import { Badge, Card } from './ui';
import { OwnerResponse } from './owner-response';

/**
 * A single anonymised resident review. Shows only the non-identifying public
 * fields (alias, tenure, date, structured sentiment) — never identity. The
 * "Resident reported" vs verified-fact distinction is reinforced in copy.
 */
export function ReviewCard({ review }: { review: PublicReview }) {
  const date = review.publishedAt ?? review.createdAt;
  return (
    <Card as="article" className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-footnote font-medium text-ink">{review.authorAlias}</span>
        {review.isVerified && <Badge tone="positive">Verified resident</Badge>}
        {review.tenure && (
          <span className="text-caption text-ink-tertiary">
            Lived here {TENURE_LABELS[review.tenure]?.toLowerCase() ?? review.tenure}
          </span>
        )}
        <span className="ml-auto text-caption text-ink-tertiary">
          {new Date(date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
        </span>
      </div>

      {(review.wouldRecommend != null || review.wouldRentAgain) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.wouldRecommend != null && (
            <Badge tone={review.wouldRecommend ? 'positive' : 'critical'}>
              {review.wouldRecommend ? 'Would recommend' : 'Would not recommend'}
            </Badge>
          )}
          {review.wouldRentAgain && (
            <Badge tone="neutral">
              Rent again: {review.wouldRentAgain.toLowerCase()}
            </Badge>
          )}
        </div>
      )}

      {review.comments && (
        <p className="mt-3 whitespace-pre-line text-body text-ink-secondary">{review.comments}</p>
      )}

      {(review.likedTags.length > 0 || review.dislikedTags.length > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {review.likedTags.length > 0 && (
            <TagGroup title="Liked" tone="positive" tags={review.likedTags} text={review.likedText} />
          )}
          {review.dislikedTags.length > 0 && (
            <TagGroup title="Disliked" tone="critical" tags={review.dislikedTags} text={review.dislikedText} />
          )}
        </div>
      )}

      <OwnerResponse reviewId={review.id} />
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
  tone: 'positive' | 'critical';
  tags: string[];
  text: string | null;
}) {
  return (
    <div className="rounded-xl bg-canvas p-3">
      <p className="mb-2 text-caption font-medium text-ink-tertiary">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Badge key={t} tone={tone === 'positive' ? 'positive' : 'caution'}>
            {humanizeTag(t)}
          </Badge>
        ))}
      </div>
      {text && <p className="mt-2 text-footnote text-ink-secondary">“{text}”</p>}
    </div>
  );
}
