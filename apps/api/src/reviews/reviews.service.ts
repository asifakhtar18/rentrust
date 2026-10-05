import { Injectable } from '@nestjs/common';
import { Prisma, Review, ReviewAnswer, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PropertiesService } from '../properties/properties.service';
import { EventBus } from '../events/event-bus';
import { DomainEvent } from '../events/events';
import {
  ConflictAppException,
  ForbiddenAppException,
  NotFoundAppException,
} from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { buildCursorPage, decodeCursor, PaginatedResult } from '../common/pagination/cursor.util';
import { ListReviewsQuery, SubmitReviewDto } from './dto/review.dto';
import { categoryScoresForReview, overallForReview } from './review-scoring';

interface ReviewCursor extends Record<string, unknown> {
  publishedAt: string;
  id: string;
}

type ReviewWithAnswer = Review & { answer: ReviewAnswer | null };

/**
 * Public, anonymised review projection. This is the ONLY shape returned on
 * public surfaces. It deliberately omits authorId, email, exact unit, and any
 * other identifying data — only a non-identifying public alias, tenure, and
 * dates are exposed. This privacy boundary is a core product promise.
 */
export interface PublicReview {
  id: string;
  propertyId: string;
  isVerified: boolean;
  tenure: Review['tenure'];
  overall: number | null;
  authorAlias: string;
  categoryScores: Record<string, number> | null;
  wouldRecommend: boolean | null;
  wouldRentAgain: string | null;
  likedTags: string[];
  dislikedTags: string[];
  likedText: string | null;
  dislikedText: string | null;
  comments: string | null;
  publishedAt: Date | null;
  createdAt: Date;
}

/**
 * Owns review persistence and the review state lifecycle:
 * DRAFT -> PENDING_MODERATION -> PUBLISHED (or REJECTED/HIDDEN/REMOVED).
 * Trust-score recalculation is NOT done here — publishing emits an event that
 * Phase 7 consumes asynchronously, so submission never blocks on scoring.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly properties: PropertiesService,
    private readonly events: EventBus,
  ) {}

  /**
   * Submits a structured review. A resident may have at most one active review
   * per property (DB partial unique index enforces this too). Reviews start in
   * PENDING_MODERATION (or DRAFT) and only become PUBLISHED after moderation.
   */
  async submit(authorId: string, dto: SubmitReviewDto): Promise<Review> {
    const property = await this.properties.getById(dto.propertyId);

    const existing = await this.prisma.review.findFirst({
      where: {
        authorId,
        propertyId: property.id,
        deletedAt: null,
        status: { not: ReviewStatus.REMOVED },
      },
    });
    if (existing) {
      throw new ConflictAppException(
        'You have already submitted a review for this property.',
        ErrorCode.REVIEW_ALREADY_SUBMITTED,
      );
    }

    const status = dto.asDraft ? ReviewStatus.DRAFT : ReviewStatus.PENDING_MODERATION;

    return this.prisma.review.create({
      data: {
        propertyId: property.id,
        authorId,
        status,
        tenure: dto.tenure,
        answer: {
          create: {
            tenure: dto.tenure,
            managementResponsiveness: dto.managementResponsiveness,
            maintenanceQuality: dto.maintenanceQuality,
            maintenanceResolution: dto.maintenanceResolution,
            depositOutcome: dto.depositOutcome,
            deductionsExplained: dto.deductionsExplained,
            communication: dto.communication,
            safety: dto.safety,
            waterSupply: dto.waterSupply,
            internet: dto.internet ?? null,
            noise: dto.noise,
            rulesStrictness: dto.rulesStrictness,
            wouldRentAgain: dto.wouldRentAgain,
            wouldRecommend: dto.wouldRecommend,
            likedTags: dto.likedTags ?? [],
            likedText: dto.likedText ?? null,
            dislikedTags: dto.dislikedTags ?? [],
            dislikedText: dto.dislikedText ?? null,
            comments: dto.comments ?? null,
          },
        },
      },
    });
  }

  /** Submits a previously-saved draft for moderation. Author only. */
  async submitDraft(authorId: string, reviewId: string): Promise<Review> {
    const review = await this.getOwned(authorId, reviewId);
    if (review.status !== ReviewStatus.DRAFT) {
      throw new ConflictAppException(
        'Only draft reviews can be submitted.',
        ErrorCode.REVIEW_INVALID_STATE,
      );
    }
    return this.prisma.review.update({
      where: { id: review.id },
      data: { status: ReviewStatus.PENDING_MODERATION },
    });
  }

  /** Author withdraws their own review (soft-remove). */
  async withdraw(authorId: string, reviewId: string): Promise<void> {
    const review = await this.getOwned(authorId, reviewId);
    await this.prisma.review.update({
      where: { id: review.id },
      data: { status: ReviewStatus.REMOVED, deletedAt: new Date() },
    });
  }

  /**
   * Lists PUBLISHED reviews for a property, anonymised, newest-first by
   * publishedAt, cursor-paginated.
   */
  async listPublicForProperty(
    propertyId: string,
    query: ListReviewsQuery,
  ): Promise<PaginatedResult<PublicReview>> {
    const property = await this.properties.getById(propertyId);
    const cursor = decodeCursor<ReviewCursor>(query.cursor);

    const where: Prisma.ReviewWhereInput = {
      propertyId: property.id,
      status: ReviewStatus.PUBLISHED,
      deletedAt: null,
      ...(query.verifiedOnly ? { isVerified: true } : {}),
      ...(cursor
        ? {
            OR: [
              { publishedAt: { lt: new Date(cursor.publishedAt) } },
              { publishedAt: new Date(cursor.publishedAt), id: { lt: cursor.id } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.review.findMany({
      where,
      include: { answer: true, author: { select: { residentProfile: true } } },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const page = buildCursorPage(rows, query.limit, (r) => ({
      publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
      id: r.id,
    }));

    return {
      ...page,
      items: page.items.map((r) => this.toPublic(r)),
    };
  }

  /** Lists the authenticated user's own reviews (all statuses). */
  async listMine(authorId: string): Promise<ReviewWithAnswer[]> {
    return this.prisma.review.findMany({
      where: { authorId, deletedAt: null },
      include: { answer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublicById(id: string): Promise<PublicReview> {
    const review = await this.prisma.review.findFirst({
      where: { id, status: ReviewStatus.PUBLISHED, deletedAt: null },
      include: { answer: true, author: { select: { residentProfile: true } } },
    });
    if (!review) {
      throw new NotFoundAppException('Review not found', ErrorCode.REVIEW_NOT_FOUND);
    }
    return this.toPublic(review);
  }

  // --------------------------------------------------------------------------

  /**
   * Anonymising mapper. Receives the full row (with author relation) but emits
   * only non-identifying fields. The author's public alias comes from their
   * ResidentProfile; the real identity never crosses this boundary.
   */
  private toPublic(
    review: Review & {
      answer: ReviewAnswer | null;
      author?: { residentProfile: { publicAlias: string } | null } | null;
    },
  ): PublicReview {
    const answer = review.answer;
    return {
      id: review.id,
      propertyId: review.propertyId,
      isVerified: review.isVerified,
      tenure: review.tenure,
      overall: review.overall,
      authorAlias: review.author?.residentProfile?.publicAlias ?? 'Verified Resident',
      categoryScores: answer ? categoryScoresForReview(answer) : null,
      wouldRecommend: answer?.wouldRecommend ?? null,
      wouldRentAgain: answer?.wouldRentAgain ?? null,
      likedTags: answer?.likedTags ?? [],
      dislikedTags: answer?.dislikedTags ?? [],
      likedText: answer?.likedText ?? null,
      dislikedText: answer?.dislikedText ?? null,
      comments: answer?.comments ?? null,
      publishedAt: review.publishedAt,
      createdAt: review.createdAt,
    };
  }

  private async getOwned(authorId: string, reviewId: string): Promise<Review> {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, deletedAt: null },
    });
    if (!review) {
      throw new NotFoundAppException('Review not found', ErrorCode.REVIEW_NOT_FOUND);
    }
    if (review.authorId !== authorId) {
      // Object-level authorization: you can only act on your own review.
      throw new ForbiddenAppException('You can only modify your own review.');
    }
    return review;
  }

  /**
   * Computes and stores the per-review overall at publish time. Called by the
   * moderation flow (Phase 9) when a review transitions to PUBLISHED. Exposed
   * here so the lifecycle logic lives with the review domain.
   */
  async markPublished(reviewId: string): Promise<Review> {
    const review = await this.prisma.review.findFirstOrThrow({
      where: { id: reviewId },
      include: { answer: true },
    });
    const overall = review.answer ? overallForReview(review.answer) : null;
    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.PUBLISHED, publishedAt: new Date(), overall },
    });
    // Fire-and-forget: triggers async trust-score recalculation.
    await this.events.emit(DomainEvent.REVIEW_PUBLISHED, {
      reviewId: updated.id,
      propertyId: updated.propertyId,
    });
    return updated;
  }

  /** Transition to REMOVED and emit so scores recalc without the review. */
  async markRemoved(reviewId: string): Promise<Review> {
    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.REMOVED },
    });
    await this.events.emit(DomainEvent.REVIEW_REMOVED, {
      reviewId: updated.id,
      propertyId: updated.propertyId,
    });
    return updated;
  }
}
