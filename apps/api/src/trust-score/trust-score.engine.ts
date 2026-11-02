import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { categoryScoresForReview } from '../reviews/review-scoring';
import { REVIEW_CATEGORY_KEYS, ReviewCategoryKey } from '../reviews/review.constants';
import { DEFAULT_SCORE_WEIGHTS } from './score-constants';

export { DEFAULT_CONFIG_NAME, DEFAULT_SCORE_WEIGHTS } from './score-constants';

export interface CategoryScoreDetail {
  score: number;
  sampleSize: number;
}

export interface ComputedScore {
  overall: number;
  sampleSize: number;
  confidence: number;
  categoryScores: Record<string, CategoryScoreDetail>;
  positiveThemes: string[];
  negativeThemes: string[];
}

/**
 * Pure-ish aggregation engine for a property's trust score. Transparent by
 * design (ADR-009): the overall is a weighted mean of per-category averages
 * across published reviews, never a black box. Confidence scales with sample
 * size up to a configurable threshold so a single review is never presented as
 * authoritative.
 */
@Injectable()
export class TrustScoreEngine {
  private readonly logger = new Logger(TrustScoreEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /** Loads the active weight configuration, falling back to defaults. */
  private async loadWeights(): Promise<{
    configId: string | null;
    weights: Record<ReviewCategoryKey, number>;
  }> {
    const active = await this.prisma.scoreConfiguration.findFirst({ where: { isActive: true } });
    if (!active) {
      return { configId: null, weights: DEFAULT_SCORE_WEIGHTS };
    }
    const parsed = active.weights as Record<string, number>;
    // Only keep known category keys; fall back per-key if missing.
    const weights = {} as Record<ReviewCategoryKey, number>;
    for (const key of REVIEW_CATEGORY_KEYS) {
      weights[key] = typeof parsed[key] === 'number' ? parsed[key] : DEFAULT_SCORE_WEIGHTS[key];
    }
    return { configId: active.id, weights };
  }

  /**
   * Recomputes a property's trust score from all its PUBLISHED, non-deleted
   * reviews and upserts PropertyScore. Idempotent: running twice on unchanged
   * data yields the same result, so BullMQ retries are safe.
   */
  async recalculate(propertyId: string): Promise<ComputedScore | null> {
    const { configId, weights } = await this.loadWeights();

    const reviews = await this.prisma.review.findMany({
      where: { propertyId, status: ReviewStatus.PUBLISHED, deletedAt: null },
      include: { answer: true },
    });

    if (reviews.length === 0) {
      // No data: remove any stale score so the property reads as "not enough data".
      await this.prisma.propertyScore.deleteMany({ where: { propertyId } });
      return null;
    }

    // Accumulate per-category sums across reviews.
    const sums = {} as Record<ReviewCategoryKey, number>;
    const counts = {} as Record<ReviewCategoryKey, number>;
    for (const key of REVIEW_CATEGORY_KEYS) {
      sums[key] = 0;
      counts[key] = 0;
    }

    const likedCounter = new Map<string, number>();
    const dislikedCounter = new Map<string, number>();

    for (const review of reviews) {
      if (!review.answer) continue;
      const perReview = categoryScoresForReview(review.answer);
      for (const key of REVIEW_CATEGORY_KEYS) {
        sums[key] += perReview[key];
        counts[key] += 1;
      }
      for (const tag of review.answer.likedTags) {
        likedCounter.set(tag, (likedCounter.get(tag) ?? 0) + 1);
      }
      for (const tag of review.answer.dislikedTags) {
        dislikedCounter.set(tag, (dislikedCounter.get(tag) ?? 0) + 1);
      }
    }

    const categoryScores: Record<string, CategoryScoreDetail> = {};
    let weightedTotal = 0;
    let weightSum = 0;
    for (const key of REVIEW_CATEGORY_KEYS) {
      const avg = counts[key] > 0 ? sums[key] / counts[key] : 0;
      categoryScores[key] = { score: Math.round(avg), sampleSize: counts[key] };
      const w = weights[key];
      weightedTotal += avg * w;
      weightSum += w;
    }

    const overall = weightSum > 0 ? Math.round(weightedTotal / weightSum) : 0;
    const sampleSize = reviews.length;
    const confidence = this.confidenceFor(sampleSize);

    const positiveThemes = this.topThemes(likedCounter);
    const negativeThemes = this.topThemes(dislikedCounter);

    // Prisma's Json input type does not accept arbitrary Record directly; cast
    // through the generated InputJsonValue type.
    const categoryScoresJson = categoryScores as unknown as Prisma.InputJsonValue;

    await this.prisma.propertyScore.upsert({
      where: { propertyId },
      create: {
        propertyId,
        configId,
        overall,
        sampleSize,
        confidence,
        categoryScores: categoryScoresJson,
        positiveThemes,
        negativeThemes,
        lastCalculatedAt: new Date(),
      },
      update: {
        configId,
        overall,
        sampleSize,
        confidence,
        categoryScores: categoryScoresJson,
        positiveThemes,
        negativeThemes,
        lastCalculatedAt: new Date(),
      },
    });

    this.logger.debug(
      `Recalculated score for property ${propertyId}: ${overall} (n=${sampleSize})`,
    );
    return { overall, sampleSize, confidence, categoryScores, positiveThemes, negativeThemes };
  }

  /**
   * Confidence 0..1 driven by sample size vs the configured threshold. Uses a
   * saturating curve so confidence rises quickly then levels off — a property
   * with 1 review is low-confidence; one at/above the threshold is high.
   */
  private confidenceFor(sampleSize: number): number {
    const threshold = this.config.get('trustScore', { infer: true }).minReviewsForFullConfidence;
    if (threshold <= 0) return 1;
    // 1 - exp(-n/ (threshold/3)) saturates near the threshold.
    const k = Math.max(1, threshold / 3);
    const confidence = 1 - Math.exp(-sampleSize / k);
    return Math.min(1, Math.round(confidence * 100) / 100);
  }

  private topThemes(counter: Map<string, number>, limit = 5): string[] {
    return [...counter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  }
}
