import { ReviewStatus } from '@prisma/client';
import { DomainEvent } from '../events/events';
import { ModerationService } from './moderation.service';

describe('ModerationService score invalidation', () => {
  const makeService = (status: ReviewStatus) => {
    const review = { id: 'review-1', propertyId: 'property-1', status, deletedAt: null };
    const prisma = {
      review: {
        findFirst: jest.fn().mockResolvedValue(review),
        update: jest.fn().mockResolvedValue({ ...review, status: ReviewStatus.HIDDEN }),
      },
      moderationAction: { create: jest.fn().mockResolvedValue({}) },
      reviewReport: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const events = { emit: jest.fn().mockResolvedValue(undefined) };
    const service = new ModerationService(
      prisma as never,
      {} as never,
      { record: jest.fn().mockResolvedValue(undefined) } as never,
      events as never,
    );
    return { service, prisma, events };
  };

  it('recalculates scores when a published review is hidden', async () => {
    const { service, events } = makeService(ReviewStatus.PUBLISHED);

    await service.moderate('moderator-1', 'review-1', 'HIDE');

    expect(events.emit).toHaveBeenCalledWith(DomainEvent.REVIEW_HIDDEN, {
      reviewId: 'review-1',
      propertyId: 'property-1',
    });
    expect(events.emit).not.toHaveBeenCalledWith(DomainEvent.REVIEW_REMOVED, expect.anything());
  });

  it('does not recalculate scores when hiding a review that was not published', async () => {
    const { service, events } = makeService(ReviewStatus.PENDING_MODERATION);

    await service.moderate('moderator-1', 'review-1', 'HIDE');

    expect(events.emit).not.toHaveBeenCalledWith(DomainEvent.REVIEW_HIDDEN, expect.anything());
    expect(events.emit).not.toHaveBeenCalledWith(DomainEvent.REVIEW_PUBLISHED, expect.anything());
  });
});
