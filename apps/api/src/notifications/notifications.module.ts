import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EventBus } from '../events/event-bus';
import { DomainEvent } from '../events/events';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Notifications module. Subscribes to domain events and turns the ones that
 * matter to a user into in-app (and optionally email) notifications. Event
 * handlers resolve the affected review's author so the right person is told,
 * and never expose reviewer identity to anyone else.
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule implements OnModuleInit {
  constructor(
    private readonly events: EventBus,
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.events.on(DomainEvent.REVIEW_PUBLISHED, async ({ reviewId }) => {
      await this.notifyReviewAuthor(reviewId, {
        type: 'REVIEW_PUBLISHED',
        title: 'Your review is live',
        body: 'Your review has been published and is now helping other renters.',
        alsoEmail: true,
      });
    });

    this.events.on(DomainEvent.REVIEW_REMOVED, async ({ reviewId }) => {
      await this.notifyReviewAuthor(reviewId, {
        type: 'REVIEW_REMOVED',
        title: 'Your review was removed',
        body: 'A moderator removed your review. You can appeal this decision.',
        alsoEmail: true,
      });
    });

    this.events.on(DomainEvent.REVIEW_VERIFIED, async ({ reviewId }) => {
      await this.notifyReviewAuthor(reviewId, {
        type: 'REVIEW_VERIFIED',
        title: 'Your residency was verified',
        body: 'Your review now carries a Verified Resident badge.',
      });
    });

    this.events.on(DomainEvent.PROPERTY_CLAIM_APPROVED, async ({ claimId }) => {
      const claim = await this.prisma.propertyClaim.findUnique({ where: { id: claimId } });
      if (claim) {
        await this.notifications.notify({
          userId: claim.claimantId,
          type: 'PROPERTY_CLAIM_APPROVED',
          title: 'Property claim approved',
          body: 'Your claim was approved. You can now respond to reviews on this property.',
          data: { propertyId: claim.propertyId },
          alsoEmail: true,
        });
      }
    });
  }

  private async notifyReviewAuthor(
    reviewId: string,
    payload: { type: string; title: string; body: string; alsoEmail?: boolean },
  ): Promise<void> {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return;
    await this.notifications.notify({
      userId: review.authorId,
      ...payload,
      data: { reviewId, propertyId: review.propertyId },
    });
  }
}
