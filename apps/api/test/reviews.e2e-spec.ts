import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './test-app';
import { ensureGeo, http, prisma, registerAdmin, registerUser } from './helpers';

/**
 * Reviews e2e. Beyond the happy path, this guards the core privacy invariant:
 * published reviews must expose a non-identifying alias and NEVER the author's
 * id, email, or any identity field.
 */
describe('Reviews (e2e)', () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof http>;
  let adminToken: string;
  let userToken: string;
  let userId: string;
  let localityId: string;

  const validReview = (propertyId: string) => ({
    propertyId,
    tenure: 'Y1_2',
    managementResponsiveness: 4,
    maintenanceQuality: 4,
    maintenanceResolution: 'D1_3',
    depositOutcome: 'FULL',
    deductionsExplained: 'YES',
    communication: 5,
    safety: 4,
    waterSupply: 5,
    internet: 4,
    noise: 4,
    rulesStrictness: 2,
    wouldRentAgain: 'YES',
    wouldRecommend: true,
    likedTags: ['spacious', 'safe_neighbourhood'],
    likedText: 'Great natural light.',
    dislikedTags: ['parking_issues'],
    comments: 'Overall a solid place to live.',
  });

  async function createProperty(): Promise<string> {
    const res = await request(
      'POST',
      '/api/v1/properties',
      {
        displayName: `Review Target ${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        propertyType: 'APARTMENT',
        localityId,
      },
      adminToken,
    );
    return res.json<{ data: { id: string } }>().data.id;
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

  it('requires authentication to submit a review', async () => {
    const propertyId = await createProperty();
    const res = await request('POST', '/api/v1/reviews', validReview(propertyId));
    expect(res.statusCode).toBe(401);
  });

  it('submits a structured review into PENDING_MODERATION', async () => {
    const propertyId = await createProperty();
    const res = await request('POST', '/api/v1/reviews', validReview(propertyId), userToken);
    expect(res.statusCode).toBe(201);
    expect(res.json<{ data: { status: string } }>().data.status).toBe('PENDING_MODERATION');
  });

  it('validates rating bounds (rejects 6/5)', async () => {
    const propertyId = await createProperty();
    const bad = { ...validReview(propertyId), safety: 6 };
    const res = await request('POST', '/api/v1/reviews', bad, userToken);
    expect(res.statusCode).toBe(422);
  });

  it('rejects a second review for the same property by the same author', async () => {
    const propertyId = await createProperty();
    const first = await request('POST', '/api/v1/reviews', validReview(propertyId), userToken);
    expect(first.statusCode).toBe(201);
    const second = await request('POST', '/api/v1/reviews', validReview(propertyId), userToken);
    expect(second.statusCode).toBe(409);
    expect(second.json<{ error: { code: string } }>().error.code).toBe('REVIEW_ALREADY_SUBMITTED');
  });

  it('does not list pending reviews publicly, but lists them once published', async () => {
    const propertyId = await createProperty();
    const submit = await request('POST', '/api/v1/reviews', validReview(propertyId), userToken);
    const reviewId = submit.json<{ data: { id: string } }>().data.id;

    const before = await request('GET', `/api/v1/properties/${propertyId}/reviews`);
    expect(before.json<{ data: unknown[] }>().data).toHaveLength(0);

    // Simulate moderation publishing (moderation endpoints land in Phase 9).
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'PUBLISHED', publishedAt: new Date(), overall: 80 },
    });

    const after = await request('GET', `/api/v1/properties/${propertyId}/reviews`);
    expect(after.json<{ data: unknown[] }>().data).toHaveLength(1);
  });

  it('NEVER exposes reviewer identity on public reviews (privacy invariant)', async () => {
    const propertyId = await createProperty();
    const submit = await request('POST', '/api/v1/reviews', validReview(propertyId), userToken);
    const reviewId = submit.json<{ data: { id: string } }>().data.id;
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'PUBLISHED', publishedAt: new Date(), overall: 80 },
    });

    const res = await request('GET', `/api/v1/properties/${propertyId}/reviews`);
    const review = res.json<{ data: Array<Record<string, unknown>> }>().data[0];
    const serialized = JSON.stringify(review);

    // Must show a non-identifying alias.
    expect(review.authorAlias).toEqual(expect.stringContaining('Verified Resident'));
    // Must NOT contain any identity field or value.
    expect(review).not.toHaveProperty('authorId');
    expect(review).not.toHaveProperty('author');
    expect(serialized).not.toContain(userId);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(serialized).not.toContain(user.email);
    // Structured content is present.
    expect(review.categoryScores).toBeDefined();
    expect(review.likedTags).toContain('spacious');
  });

  it('lets an author list and withdraw their own review but not others', async () => {
    const propertyId = await createProperty();
    const submit = await request('POST', '/api/v1/reviews', validReview(propertyId), userToken);
    const reviewId = submit.json<{ data: { id: string } }>().data.id;

    const mine = await request('GET', '/api/v1/me/reviews', undefined, userToken);
    expect(mine.statusCode).toBe(200);
    expect(mine.json<{ data: unknown[] }>().data.length).toBeGreaterThan(0);

    // A different user cannot withdraw this review.
    const otherToken = (await registerUser(app)).token;
    const forbidden = await request('DELETE', `/api/v1/reviews/${reviewId}`, undefined, otherToken);
    expect(forbidden.statusCode).toBe(403);

    const withdraw = await request('DELETE', `/api/v1/reviews/${reviewId}`, undefined, userToken);
    expect(withdraw.statusCode).toBe(200);
  });
});
