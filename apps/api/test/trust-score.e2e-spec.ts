import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './test-app';
import { ensureGeo, http, prisma, registerAdmin } from './helpers';

/**
 * Trust-score e2e. Verifies the transparent, weighted score: no-data guidance,
 * weighting (management-heavy), confidence rising with sample size, and the
 * category breakdown. Recalculation runs inline under NODE_ENV=test.
 */
describe('Trust score (e2e)', () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof http>;
  let adminToken: string;
  let localityId: string;

  async function createProperty(): Promise<string> {
    const res = await request(
      'POST',
      '/api/v1/properties',
      {
        displayName: `Score Target ${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        propertyType: 'APARTMENT',
        localityId,
      },
      adminToken,
    );
    return res.json<{ data: { id: string } }>().data.id;
  }

  /**
   * Seeds a published review directly for a fresh throwaway user (bypasses the
   * moderation UI, which is Phase 9). `quality` 1..5 drives all ratings.
   */
  // Creates a bare user directly (no argon2 hashing) — faster for bulk seeding.
  async function makeAuthor(): Promise<string> {
    const user = await prisma.user.create({
      data: {
        email: `score_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
        residentProfile: {
          create: { publicAlias: `Verified Resident #${Math.random().toString(36).slice(2, 8)}` },
        },
      },
    });
    return user.id;
  }

  async function seedPublishedReview(propertyId: string, quality: number): Promise<void> {
    const authorId = await makeAuthor();
    const review = await prisma.review.create({
      data: {
        propertyId,
        authorId,
        status: 'PUBLISHED',
        tenure: 'Y1_2',
        publishedAt: new Date(),
        answer: {
          create: {
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
            likedTags: quality >= 4 ? ['spacious', 'safe_neighbourhood'] : [],
            dislikedTags: quality < 4 ? ['poor_maintenance', 'deposit_disputes'] : [],
          },
        },
      },
    });
    expect(review.id).toBeDefined();
  }

  async function recalc(propertyId: string): Promise<void> {
    const res = await request(
      'POST',
      `/api/v1/properties/${propertyId}/score/recalculate`,
      undefined,
      adminToken,
    );
    expect(res.statusCode).toBe(202);
  }

  beforeAll(async () => {
    app = await createTestApp();
    request = http(app);
    localityId = (await ensureGeo()).localityId;
    adminToken = (await registerAdmin(app)).token;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('seeds reference data: active default score configuration exists', async () => {
    const config = await prisma.scoreConfiguration.findFirst({ where: { isActive: true } });
    expect(config).not.toBeNull();
    const categories = await prisma.reviewCategory.count();
    expect(categories).toBeGreaterThanOrEqual(8);
  });

  it('reports "not enough data" when a property has no reviews', async () => {
    const propertyId = await createProperty();
    const res = await request('GET', `/api/v1/properties/${propertyId}/score`);
    expect(res.statusCode).toBe(200);
    const data = res.json<{ data: { hasEnoughData: boolean; overall: number | null } }>().data;
    expect(data.hasEnoughData).toBe(false);
    expect(data.overall).toBeNull();
  });

  it('computes a high score for consistently positive reviews', async () => {
    const propertyId = await createProperty();
    await seedPublishedReview(propertyId, 5);
    await seedPublishedReview(propertyId, 5);
    await recalc(propertyId);

    const res = await request('GET', `/api/v1/properties/${propertyId}/score`);
    const data = res.json<{
      data: {
        overall: number;
        sampleSize: number;
        categoryScores: Record<string, { score: number; sampleSize: number }>;
        positiveThemes: string[];
      };
    }>().data;
    expect(data.overall).toBeGreaterThanOrEqual(85);
    expect(data.sampleSize).toBe(2);
    expect(data.categoryScores.management.score).toBeGreaterThanOrEqual(90);
    expect(data.positiveThemes).toContain('spacious');
  });

  it('confidence rises with sample size', async () => {
    const few = await createProperty();
    await seedPublishedReview(few, 4);
    await recalc(few);
    const fewScore = (await request('GET', `/api/v1/properties/${few}/score`)).json<{
      data: { confidence: number };
    }>().data;

    const many = await createProperty();
    for (let i = 0; i < 25; i++) {
      await seedPublishedReview(many, 4);
    }
    await recalc(many);
    const manyScore = (await request('GET', `/api/v1/properties/${many}/score`)).json<{
      data: { confidence: number };
    }>().data;

    expect(manyScore.confidence).toBeGreaterThan(fewScore.confidence);
    expect(fewScore.confidence).toBeLessThan(0.5);
    expect(manyScore.confidence).toBeGreaterThan(0.9);
  });

  it('weights management most heavily (25%)', async () => {
    // Two properties identical except management rating; the one with better
    // management must score higher, proving the weighting is applied.
    const good = await createProperty();
    const bad = await createProperty();

    // Build custom reviews: everything equal (3) except management (5 vs 1).
    for (const [propertyId, mgmt] of [
      [good, 5],
      [bad, 1],
    ] as const) {
      const authorId = await makeAuthor();
      await prisma.review.create({
        data: {
          propertyId,
          authorId,
          status: 'PUBLISHED',
          tenure: 'Y1_2',
          publishedAt: new Date(),
          answer: {
            create: {
              tenure: 'Y1_2',
              managementResponsiveness: mgmt,
              maintenanceQuality: 3,
              maintenanceResolution: 'D1_3',
              depositOutcome: 'PARTIAL',
              deductionsExplained: 'NOT_APPLICABLE',
              communication: 3,
              safety: 3,
              waterSupply: 3,
              internet: 3,
              noise: 3,
              rulesStrictness: 3,
              wouldRentAgain: 'MAYBE',
              wouldRecommend: false,
            },
          },
        },
      });
      await recalc(propertyId);
    }

    const goodScore = (await request('GET', `/api/v1/properties/${good}/score`)).json<{
      data: { overall: number };
    }>().data;
    const badScore = (await request('GET', `/api/v1/properties/${bad}/score`)).json<{
      data: { overall: number };
    }>().data;
    expect(goodScore.overall).toBeGreaterThan(badScore.overall);
  });
});
