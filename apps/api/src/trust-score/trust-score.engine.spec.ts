import { PrismaService } from '../database/prisma.service';
import { DEFAULT_SCORE_WEIGHTS, TrustScoreEngine } from './trust-score.engine';

/**
 * Unit tests for the trust-score engine's math, isolated from a real database
 * via a hand-rolled Prisma stub. Verifies the weighting is applied, confidence
 * rises with sample size, and the "no reviews" path clears the score — the
 * three behaviours the product's transparency promise depends on.
 */

function makeAnswer(quality: number) {
  return {
    tenure: 'Y1_2',
    managementResponsiveness: quality,
    maintenanceQuality: quality,
    maintenanceResolution: quality >= 4 ? 'LT_24H' : 'GT_7D',
    depositOutcome: quality >= 4 ? 'FULL' : 'NOT_RETURNED',
    deductionsExplained: quality >= 4 ? 'YES' : 'NO',
    communication: quality,
    safety: quality,
    waterSupply: quality,
    internet: quality,
    noise: quality,
    rulesStrictness: 6 - quality,
    wouldRentAgain: quality >= 4 ? 'YES' : 'NO',
    wouldRecommend: quality >= 4,
    likedTags: quality >= 4 ? ['spacious'] : [],
    dislikedTags: quality < 4 ? ['noisy'] : [],
  };
}

interface StubState {
  reviews: Array<{ answer: ReturnType<typeof makeAnswer> }>;
  upserted?: { overall: number; sampleSize: number; confidence: number };
  deleted: boolean;
}

function buildEngine(state: StubState): TrustScoreEngine {
  const prisma = {
    scoreConfiguration: { findFirst: async () => null },
    review: { findMany: async () => state.reviews },
    propertyScore: {
      deleteMany: async () => {
        state.deleted = true;
        return { count: 0 };
      },
      upsert: async (args: {
        create: { overall: number; sampleSize: number; confidence: number };
      }) => {
        state.upserted = {
          overall: args.create.overall,
          sampleSize: args.create.sampleSize,
          confidence: args.create.confidence,
        };
        return state.upserted;
      },
    },
  } as unknown as PrismaService;

  const config = {
    get: () => ({ minReviewsForFullConfidence: 30 }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return new TrustScoreEngine(prisma, config);
}

describe('TrustScoreEngine', () => {
  it('has weights summing to 1.0 by default', () => {
    const sum = Object.values(DEFAULT_SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('clears the score when there are no published reviews', async () => {
    const state: StubState = { reviews: [], deleted: false };
    const engine = buildEngine(state);
    const result = await engine.recalculate('p1');
    expect(result).toBeNull();
    expect(state.deleted).toBe(true);
  });

  it('produces a high overall for positive reviews', async () => {
    const state: StubState = {
      reviews: [{ answer: makeAnswer(5) }, { answer: makeAnswer(5) }],
      deleted: false,
    };
    const engine = buildEngine(state);
    const result = await engine.recalculate('p1');
    expect(result!.overall).toBeGreaterThanOrEqual(85);
    expect(result!.sampleSize).toBe(2);
  });

  it('raises confidence as sample size grows', async () => {
    const few: StubState = { reviews: [{ answer: makeAnswer(4) }], deleted: false };
    const many: StubState = {
      reviews: Array.from({ length: 30 }, () => ({ answer: makeAnswer(4) })),
      deleted: false,
    };
    const fewResult = await buildEngine(few).recalculate('p1');
    const manyResult = await buildEngine(many).recalculate('p2');
    expect(fewResult!.confidence).toBeLessThan(0.5);
    expect(manyResult!.confidence).toBeGreaterThan(0.9);
    expect(manyResult!.confidence).toBeGreaterThan(fewResult!.confidence);
  });
});
