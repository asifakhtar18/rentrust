import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './test-app';
import { ensureGeo, http, prisma, registerAdmin, registerUser } from './helpers';

/**
 * Phase 12 e2e: analytics, notifications, saved properties, comparison, and
 * locality intelligence.
 */
describe('Analytics / Notifications / Engagement (e2e)', () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof http>;
  let adminToken: string;
  let userToken: string;
  let userId: string;
  let localityId: string;

  async function createProperty(coords?: { lat: number; lng: number }): Promise<string> {
    const res = await request(
      'POST',
      '/api/v1/properties',
      {
        displayName: `Engage ${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        propertyType: 'APARTMENT',
        localityId,
        ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
      },
      adminToken,
    );
    return res.json<{ data: { id: string } }>().data.id;
  }

  async function seedPublishedReview(propertyId: string, quality: number): Promise<string> {
    const user = await prisma.user.create({
      data: {
        email: `eng_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
        residentProfile: {
          create: { publicAlias: `Verified Resident #${Math.random().toString(36).slice(2, 8)}` },
        },
      },
    });
    const review = await prisma.review.create({
      data: {
        propertyId,
        authorId: user.id,
        status: 'PUBLISHED',
        tenure: 'Y1_2',
        publishedAt: new Date(),
        overall: quality * 20,
        answer: {
          create: {
            tenure: 'Y1_2',
            managementResponsiveness: quality,
            maintenanceQuality: quality,
            maintenanceResolution: 'D1_3',
            depositOutcome: 'FULL',
            deductionsExplained: 'YES',
            communication: quality,
            safety: quality,
            waterSupply: quality,
            noise: quality,
            rulesStrictness: 2,
            wouldRentAgain: 'YES',
            wouldRecommend: true,
            likedTags: ['spacious'],
            dislikedTags: quality < 3 ? ['noisy'] : [],
          },
        },
      },
    });
    return review.id;
  }

  beforeAll(async () => {
    app = await createTestApp();
    request = http(app);
    localityId = (await ensureGeo()).localityId;
    adminToken = (await registerAdmin(app)).token;
    const u = await registerUser(app);
    userToken = u.token;
    userId = u.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('records an analytics event (anonymous allowed)', async () => {
    const res = await request('POST', '/api/v1/analytics/events', {
      name: 'SEARCH_PERFORMED',
      anonId: 'anon-123',
      props: { query: 'whitefield' },
    });
    expect(res.statusCode).toBe(202);
    const count = await prisma.analyticsEvent.count({ where: { name: 'SEARCH_PERFORMED' } });
    expect(count).toBeGreaterThan(0);
  });

  it('saves, lists, and unsaves a property', async () => {
    const propertyId = await createProperty();

    const save = await request(
      'POST',
      `/api/v1/properties/${propertyId}/save`,
      undefined,
      userToken,
    );
    expect(save.statusCode).toBe(200);

    const saved = await request('GET', '/api/v1/me/saved', undefined, userToken);
    const ids = saved.json<{ data: Array<{ id: string }> }>().data.map((p) => p.id);
    expect(ids).toContain(propertyId);

    const unsave = await request(
      'DELETE',
      `/api/v1/properties/${propertyId}/save`,
      undefined,
      userToken,
    );
    expect(unsave.statusCode).toBe(200);

    const after = await request('GET', '/api/v1/me/saved', undefined, userToken);
    expect(after.json<{ data: Array<{ id: string }> }>().data.map((p) => p.id)).not.toContain(
      propertyId,
    );
  });

  it('compares 2 properties and rejects out-of-range counts', async () => {
    const a = await createProperty();
    const b = await createProperty();
    await seedPublishedReview(a, 5);
    await request('POST', `/api/v1/properties/${a}/score/recalculate`, undefined, adminToken);

    const cmp = await request('GET', `/api/v1/compare?ids=${a},${b}`);
    expect(cmp.statusCode).toBe(200);
    const data = cmp.json<{
      data: Array<{ property: { id: string }; score: { hasEnoughData: boolean } }>;
    }>().data;
    expect(data).toHaveLength(2);
    const scoredEntry = data.find((d) => d.property.id === a);
    expect(scoredEntry!.score.hasEnoughData).toBe(true);

    const tooFew = await request('GET', `/api/v1/compare?ids=${a}`);
    expect(tooFew.statusCode).toBe(400);
  });

  it('derives locality intelligence from property scores', async () => {
    const geo = await ensureGeo();
    const p = await createProperty();
    await seedPublishedReview(p, 5);
    await seedPublishedReview(p, 4);
    await request('POST', `/api/v1/properties/${p}/score/recalculate`, undefined, adminToken);

    const res = await request('GET', `/api/v1/localities/${geo.localityId}`);
    expect(res.statusCode).toBe(200);
    const data = res.json<{
      data: { hasEnoughData: boolean; averageTrustScore?: number; commonPositiveThemes?: string[] };
    }>().data;
    expect(data.hasEnoughData).toBe(true);
    expect(typeof data.averageTrustScore).toBe('number');
    expect(data.commonPositiveThemes).toContain('spacious');
  });

  it('creates an in-app notification when a review is published, and marks it read', async () => {
    const propertyId = await createProperty();
    // Submit a review as the user through the API, then publish via moderation.
    const submit = await request(
      'POST',
      '/api/v1/reviews',
      {
        propertyId,
        tenure: 'Y1_2',
        managementResponsiveness: 4,
        maintenanceQuality: 4,
        maintenanceResolution: 'D1_3',
        depositOutcome: 'FULL',
        deductionsExplained: 'YES',
        communication: 4,
        safety: 4,
        waterSupply: 4,
        noise: 4,
        rulesStrictness: 2,
        wouldRentAgain: 'YES',
        wouldRecommend: true,
      },
      userToken,
    );
    const reviewId = submit.json<{ data: { id: string } }>().data.id;
    await request(
      'POST',
      `/api/v1/moderation/reviews/${reviewId}/decision`,
      { decision: 'PUBLISH' },
      adminToken,
    );

    const list = await request('GET', '/api/v1/notifications', undefined, userToken);
    expect(list.statusCode).toBe(200);
    const items = list.json<{
      data: Array<{ id: string; type: string }>;
      meta: { unread: number };
    }>();
    const published = items.data.find((n) => n.type === 'REVIEW_PUBLISHED');
    expect(published).toBeDefined();
    expect(items.meta.unread).toBeGreaterThan(0);

    const read = await request(
      'POST',
      `/api/v1/notifications/${published!.id}/read`,
      undefined,
      userToken,
    );
    expect(read.statusCode).toBe(200);

    expect(userId).toBeDefined();
  });
});
