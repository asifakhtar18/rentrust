import type { ReviewCategoryKey } from '../reviews/review.constants';

/**
 * Default category weights (ADR-009) used by the Nest trust-score engine.
 */
export const DEFAULT_SCORE_WEIGHTS: Record<ReviewCategoryKey, number> = {
  management: 0.25,
  maintenance: 0.15,
  deposit: 0.1,
  communication: 0.1,
  safety: 0.1,
  condition: 0.1,
  rules: 0.1,
  experience: 0.1,
};

export const DEFAULT_CONFIG_NAME = 'default-v1';
