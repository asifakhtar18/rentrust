import type {
  DepositOutcome,
  MaintenanceResolutionBucket,
  ReviewAnswer,
  YesNoNa,
} from '@prisma/client';
import type { ReviewCategoryKey } from './review.constants';

/**
 * Pure functions that translate a single review's structured answers into
 * normalised 0-100 category scores. Kept dependency-free and side-effect-free
 * so both review publishing and the trust-score aggregation (Phase 7) reuse the
 * exact same mapping — one definition of "what a good score means".
 */

/** Maps a 1-5 rating onto 0-100 (1 -> 0, 3 -> 50, 5 -> 100). */
export function ratingToScore(rating: number): number {
  const clamped = Math.min(5, Math.max(1, rating));
  return ((clamped - 1) / 4) * 100;
}

function depositScore(outcome: DepositOutcome, explained: YesNoNa): number {
  const base: Record<DepositOutcome, number> = {
    FULL: 100,
    PARTIAL: 55,
    STILL_WAITING: 35,
    NOT_RETURNED: 0,
  };
  // A clear explanation of deductions is a small positive signal.
  const explanationBonus = explained === 'YES' ? 10 : 0;
  return Math.min(100, base[outcome] + explanationBonus);
}

function maintenanceResolutionScore(bucket: MaintenanceResolutionBucket): number {
  const map: Record<MaintenanceResolutionBucket, number> = {
    LT_24H: 100,
    D1_3: 75,
    D3_7: 45,
    GT_7D: 15,
  };
  return map[bucket];
}

/**
 * Per-category 0-100 scores derived from one review. Categories mirror
 * REVIEW_CATEGORY_KEYS. `internet` being N/A is simply folded into the
 * experience category by omission.
 */
export function categoryScoresForReview(answer: ReviewAnswer): Record<ReviewCategoryKey, number> {
  const management = ratingToScore(answer.managementResponsiveness);

  const maintenance =
    (ratingToScore(answer.maintenanceQuality) +
      maintenanceResolutionScore(answer.maintenanceResolution)) /
    2;

  const deposit = depositScore(answer.depositOutcome, answer.deductionsExplained);

  const communication = ratingToScore(answer.communication);
  const safety = ratingToScore(answer.safety);

  // "Condition" blends tangible living-condition signals.
  const conditionParts = [ratingToScore(answer.waterSupply), ratingToScore(answer.noise)];
  if (answer.internet != null) {
    conditionParts.push(ratingToScore(answer.internet));
  }
  const condition = conditionParts.reduce((a, b) => a + b, 0) / conditionParts.length;

  // Rules transparency: moderate strictness reads better than extremes; we
  // reward predictability (mid-range) slightly less harshly than very strict.
  const rules = ratingToScore(6 - answer.rulesStrictness); // invert: lax rules score higher

  // Overall living experience sentiment from recommend / rent-again.
  const recommend = answer.wouldRecommend ? 100 : 0;
  const rentAgain =
    answer.wouldRentAgain === 'YES' ? 100 : answer.wouldRentAgain === 'MAYBE' ? 55 : 0;
  const experience = (recommend + rentAgain) / 2;

  return {
    management,
    maintenance,
    deposit,
    communication,
    safety,
    condition,
    rules,
    experience,
  };
}

/** Equal-weighted overall for a single review (property-level weighting is applied in Phase 7). */
export function overallForReview(answer: ReviewAnswer): number {
  const scores = Object.values(categoryScoresForReview(answer));
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(mean);
}
