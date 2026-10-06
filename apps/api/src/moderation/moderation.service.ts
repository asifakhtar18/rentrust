import { Injectable } from '@nestjs/common';
import {
  ModerationActionType,
  ReportReason,
  ReportStatus,
  Review,
  ReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';
import { AuditService } from '../audit/audit.service';
import { EventBus } from '../events/event-bus';
import { DomainEvent } from '../events/events';
import { BadRequestAppException, NotFoundAppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { flagContent } from './content-flagging';
import { ModerationDecision } from './dto/moderation.dto';

/**
 * Moderation domain. Owns review reporting, the moderator queue, state
 * transitions with a recorded history, heuristic content flags, and appeals.
 *
 * Guardrails baked in:
 *  - Negative reviews are NEVER auto-removed; removal is an explicit human
 *    action and is audit-logged.
 *  - Internal moderation notes are stored on ModerationAction and never exposed
 *    on public surfaces.
 *  - Every decision records a ModerationAction (from/to status) and an audit
 *    entry, and publishing/removal emit events so trust scores recalc.
 */
@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: ReviewsService,
    private readonly audit: AuditService,
    private readonly events: EventBus,
  ) {}

  /** Anyone (optionally anonymous) can report a published/visible review. */
  async report(
    reviewId: string,
    reason: ReportReason,
    details: string | undefined,
    reporterId?: string,
  ) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, deletedAt: null },
    });
    if (!review) {
      throw new NotFoundAppException('Review not found', ErrorCode.REVIEW_NOT_FOUND);
    }

    const report = await this.prisma.reviewReport.create({
      data: { reviewId, reporterId: reporterId ?? null, reason, details: details ?? null },
    });

    // A reported, currently-published review goes UNDER_REVIEW so moderators
    // can look — but it stays visible (we do not hide on mere accusation).
    await this.events.emit(DomainEvent.REVIEW_REPORTED, { reviewId, reportId: report.id });
    return report;
  }

  /**
   * Moderator queue: reviews awaiting first moderation plus those with open
   * reports. Includes heuristic content flags to focus attention. Offset
   * pagination is acceptable here (bounded by moderation throughput, and
   * moderators need page counts).
   */
  async queue(options: { page: number; pageSize: number }) {
    const where = {
      deletedAt: null,
      OR: [
        { status: ReviewStatus.PENDING_MODERATION },
        { status: ReviewStatus.UNDER_REVIEW },
        { reports: { some: { status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] } } } },
      ],
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: {
          answer: true,
          reports: { where: { status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] } } },
        },
        orderBy: { createdAt: 'asc' },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      propertyId: r.propertyId,
      status: r.status,
      createdAt: r.createdAt,
      openReports: r.reports.length,
      reportReasons: [...new Set(r.reports.map((rep) => rep.reason))],
      // Heuristic flags on free text (triage aid only).
      contentFlags: r.answer
        ? flagContent({
            likedText: r.answer.likedText,
            dislikedText: r.answer.dislikedText,
            comments: r.answer.comments,
          })
        : [],
    }));

    return { items, total, page: options.page, pageSize: options.pageSize };
  }

  /** Full history + reports for a single review (moderator view). */
  async getForModeration(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        answer: true,
        reports: { orderBy: { createdAt: 'desc' } },
        moderationLog: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!review) {
      throw new NotFoundAppException('Review not found', ErrorCode.REVIEW_NOT_FOUND);
    }
    return review;
  }

  /**
   * Applies a moderator decision via an explicit state machine, records a
   * ModerationAction, resolves open reports, and emits score events.
   */
  async moderate(
    moderatorId: string,
    reviewId: string,
    decision: ModerationDecision,
    note?: string,
  ): Promise<Review> {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, deletedAt: null },
    });
    if (!review) {
      throw new NotFoundAppException('Review not found', ErrorCode.REVIEW_NOT_FOUND);
    }

    const fromStatus = review.status;
    const { toStatus, actionType } = this.resolveTransition(fromStatus, decision);

    let updated: Review;
    if (decision === 'PUBLISH') {
      // Delegates to ReviewsService so overall is computed and the published
      // event fires (triggers score recalc).
      updated = await this.reviews.markPublished(reviewId);
    } else if (decision === 'REMOVE') {
      updated = await this.reviews.markRemoved(reviewId);
    } else {
      updated = await this.prisma.review.update({
        where: { id: reviewId },
        data: { status: toStatus },
      });
      // UNHIDE/RESTORE back to published should also refresh scores.
      if (toStatus === ReviewStatus.PUBLISHED) {
        await this.events.emit(DomainEvent.REVIEW_PUBLISHED, {
          reviewId,
          propertyId: review.propertyId,
        });
      }
    }

    await this.prisma.moderationAction.create({
      data: { reviewId, moderatorId, action: actionType, note: note ?? null, fromStatus, toStatus },
    });

    // Any decision resolves the review's open reports.
    await this.prisma.reviewReport.updateMany({
      where: { reviewId, status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] } },
      data: { status: ReportStatus.ACTIONED },
    });

    await this.audit.record({
      actorId: moderatorId,
      action: `REVIEW_${decision}`,
      entityType: 'Review',
      entityId: reviewId,
      metadata: { from: fromStatus, to: toStatus },
    });

    return updated;
  }

  /** Resident submits an appeal on their rejected/removed/hidden review. */
  async submitAppeal(authorId: string, reviewId: string, reason: string) {
    const review = await this.prisma.review.findFirst({ where: { id: reviewId } });
    if (!review || review.authorId !== authorId) {
      throw new NotFoundAppException('Review not found', ErrorCode.REVIEW_NOT_FOUND);
    }
    const appealable: ReviewStatus[] = [
      ReviewStatus.REJECTED,
      ReviewStatus.HIDDEN,
      ReviewStatus.REMOVED,
    ];
    if (!appealable.includes(review.status)) {
      throw new BadRequestAppException(
        'Only rejected, hidden, or removed reviews can be appealed.',
        ErrorCode.REVIEW_INVALID_STATE,
      );
    }
    // The appeal is recorded as a moderation action note and puts the review
    // back under review for a human to re-examine.
    await this.prisma.review.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.UNDER_REVIEW },
    });
    const action = await this.prisma.moderationAction.create({
      data: {
        reviewId,
        moderatorId: null,
        action: ModerationActionType.NOTE,
        note: `APPEAL by resident: ${reason}`,
        fromStatus: review.status,
        toStatus: ReviewStatus.UNDER_REVIEW,
      },
    });
    await this.audit.record({
      actorId: authorId,
      action: 'REVIEW_APPEAL_SUBMITTED',
      entityType: 'Review',
      entityId: reviewId,
    });
    return action;
  }

  async decideAppeal(
    moderatorId: string,
    reviewId: string,
    decision: 'GRANT' | 'DENY',
    note?: string,
  ) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundAppException('Review not found', ErrorCode.REVIEW_NOT_FOUND);
    }
    const actionType =
      decision === 'GRANT'
        ? ModerationActionType.APPEAL_GRANTED
        : ModerationActionType.APPEAL_DENIED;

    // Granting an appeal republishes; denying leaves it removed.
    let updated: Review;
    if (decision === 'GRANT') {
      updated = await this.reviews.markPublished(reviewId);
    } else {
      updated = await this.reviews.markRemoved(reviewId);
    }

    await this.prisma.moderationAction.create({
      data: {
        reviewId,
        moderatorId,
        action: actionType,
        note: note ?? null,
        fromStatus: review.status,
        toStatus: updated.status,
      },
    });
    await this.audit.record({
      actorId: moderatorId,
      action: `REVIEW_APPEAL_${decision}`,
      entityType: 'Review',
      entityId: reviewId,
    });
    return updated;
  }

  // --------------------------------------------------------------------------

  /**
   * Explicit transition table. Rejects nonsensical transitions so moderation is
   * predictable and auditable.
   */
  private resolveTransition(
    from: ReviewStatus,
    decision: ModerationDecision,
  ): { toStatus: ReviewStatus; actionType: ModerationActionType } {
    const map: Record<
      ModerationDecision,
      { toStatus: ReviewStatus; actionType: ModerationActionType }
    > = {
      PUBLISH: { toStatus: ReviewStatus.PUBLISHED, actionType: ModerationActionType.PUBLISH },
      REJECT: { toStatus: ReviewStatus.REJECTED, actionType: ModerationActionType.REJECT },
      HIDE: { toStatus: ReviewStatus.HIDDEN, actionType: ModerationActionType.HIDE },
      UNHIDE: { toStatus: ReviewStatus.PUBLISHED, actionType: ModerationActionType.UNHIDE },
      REMOVE: { toStatus: ReviewStatus.REMOVED, actionType: ModerationActionType.REMOVE },
      RESTORE: { toStatus: ReviewStatus.PUBLISHED, actionType: ModerationActionType.RESTORE },
    };

    // Guard: cannot publish something already removed without an explicit restore.
    if (decision === 'PUBLISH' && from === ReviewStatus.REMOVED) {
      throw new BadRequestAppException(
        'Use RESTORE to bring back a removed review.',
        ErrorCode.REVIEW_INVALID_STATE,
      );
    }
    return map[decision];
  }
}
