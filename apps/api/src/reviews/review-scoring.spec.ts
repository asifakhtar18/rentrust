import { ReviewAnswer } from '@prisma/client';
import { categoryScoresForReview, overallForReview, ratingToScore } from './review-scoring';

function makeAnswer(overrides: Partial<ReviewAnswer> = {}): ReviewAnswer {
  return {
    id: 'a',
    reviewId: 'r',
    tenure: 'Y1_2',
    managementResponsiveness: 5,
    maintenanceQuality: 5,
    maintenanceResolution: 'LT_24H',
    depositOutcome: 'FULL',
    deductionsExplained: 'YES',
    communication: 5,
    safety: 5,
    waterSupply: 5,
    internet: 5,
    noise: 5,
    rulesStrictness: 1,
    wouldRentAgain: 'YES',
    wouldRecommend: true,
    likedTags: [],
    likedText: null,
    dislikedTags: [],
    dislikedText: null,
    comments: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('review scoring', () => {
  it('maps 1-5 ratings onto 0-100', () => {
    expect(ratingToScore(1)).toBe(0);
    expect(ratingToScore(3)).toBe(50);
    expect(ratingToScore(5)).toBe(100);
  });

  it('scores a perfect review at or near 100', () => {
    expect(overallForReview(makeAnswer())).toBeGreaterThanOrEqual(95);
  });

  it('scores a worst-case review near 0', () => {
    const worst = makeAnswer({
      managementResponsiveness: 1,
      maintenanceQuality: 1,
      maintenanceResolution: 'GT_7D',
      depositOutcome: 'NOT_RETURNED',
      deductionsExplained: 'NO',
      communication: 1,
      safety: 1,
      waterSupply: 1,
      internet: 1,
      noise: 1,
      rulesStrictness: 5,
      wouldRentAgain: 'NO',
      wouldRecommend: false,
    });
    expect(overallForReview(worst)).toBeLessThan(15);
  });

  it('rewards a returned deposit over a withheld one', () => {
    const full = categoryScoresForReview(makeAnswer({ depositOutcome: 'FULL' }));
    const withheld = categoryScoresForReview(makeAnswer({ depositOutcome: 'NOT_RETURNED' }));
    expect(full.deposit).toBeGreaterThan(withheld.deposit);
  });

  it('handles not-applicable internet without skewing condition', () => {
    const scores = categoryScoresForReview(makeAnswer({ internet: null }));
    expect(scores.condition).toBeGreaterThanOrEqual(0);
    expect(scores.condition).toBeLessThanOrEqual(100);
  });
});
