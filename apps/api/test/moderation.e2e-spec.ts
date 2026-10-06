import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './test-app';
import { ensureGeo, http, prisma, registerAdmin, registerUser } from './helpers';

/**
 * Moderation e2e. Covers reporting, the moderator queue (with content flags and
 * RBAC), the decision state machine, the "negative reviews are not auto-removed"
 * guardrail, that internal notes never surface publicly, and the appeal flow.
 */
describe('Moderation (e2e)', () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof http>;
  let adminToken: string;
  let userToken: string;
  let userId: string;
  let localityId: string;

  async function createProperty(): Promise<string> {
    const res = await request(
      'POST',
      '/api/v1/properties',
      {
        displayName: `Mod Target ${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        propertyType: 'APARTMENT',
        localityId,
      },
      adminToken,
    );
    return res.json<{ data: { id: string } }>().data.id;
  }

  async function submitReview(
    propertyId: string,
    token: string,
    overrides: Record<string, unknown> = {},
  ) {
    const res = await request(
      'POST',
      '/api/v1/reviews',
      {
        propertyId,
        tenure: 'Y1_2',
        managementResponsiveness: 2,
        maintenanceQuality: 2,
        maintenanceResolution: 'GT_7D',
        depositOutcome: 'NOT_RETURNED',
        deductionsExplained: 'NO',
        communication: 2,
        safety: 2,
        waterSupply: 2,
        noise: 2,
        rulesStrictness: 4,
        wouldRentAgain: 'NO',
        wouldRecommend: false,
        dislikedText: 'Maintenance was consistently slow and unhelpful.',
        ...overrides,
      },
      token,
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

  it('shows pending reviews in the moderator queue (RBAC: user forbidden)', async () => {
    const propertyId = await createProperty();
    await submitReview(propertyId, userToken);

    const forbidden = await request('GET', '/api/v1/moderation/queue', undefined, userToken);
    expect(forbidden.statusCode).toBe(403);

    const queue = await request(
      'GET',
      '/api/v1/moderation/queue?pageSize=100',
      undefined,
      adminToken,
    );
    expect(queue.statusCode).toBe(200);
    const items = queue.json<{ data: Array<{ id: string; status: string }> }>().data;
    expect(items.some((i) => i.status === 'PENDING_MODERATION')).toBe(true);
  });

  it('publishes a review through moderation and records history (notes stay internal)', async () => {
    const propertyId = await createProperty();
    const reviewId = await submitReview(propertyId, userToken);

    const decide = await request(
      'POST',
      `/api/v1/moderation/reviews/${reviewId}/decision`,
      { decision: 'PUBLISH', note: 'Looks legitimate; publishing.' },
      adminToken,
    );
    expect(decide.statusCode).toBe(200);
    expect(decide.json<{ data: { status: string } }>().data.status).toBe('PUBLISHED');

    // Public review listing must not leak the internal moderation note.
    const publicList = await request('GET', `/api/v1/properties/${propertyId}/reviews`);
    expect(JSON.stringify(publicList.json())).not.toContain('Looks legitimate');

    // Moderation history records the transition.
    const detail = await request(
      'GET',
      `/api/v1/moderation/reviews/${reviewId}`,
      undefined,
      adminToken,
    );
    const log = detail.json<{
      data: { moderationLog: Array<{ action: string; fromStatus: string; toStatus: string }> };
    }>().data.moderationLog;
    expect(log[0].action).toBe('PUBLISH');
    expect(log[0].fromStatus).toBe('PENDING_MODERATION');
    expect(log[0].toStatus).toBe('PUBLISHED');
  });

  it('does NOT auto-remove a negative review; it stays visible until a human acts', async () => {
    const propertyId = await createProperty();
    const reviewId = await submitReview(propertyId, userToken); // strongly negative
    await request(
      'POST',
      `/api/v1/moderation/reviews/${reviewId}/decision`,
      { decision: 'PUBLISH' },
      adminToken,
    );

    // Reporting it does not hide it.
    const report = await request('POST', `/api/v1/reviews/${reviewId}/report`, {
      reason: 'DEFAMATION',
      details: 'I disagree with this review',
    });
    expect(report.statusCode).toBe(202);

    const publicList = await request('GET', `/api/v1/properties/${propertyId}/reviews`);
    expect(publicList.json<{ data: unknown[] }>().data).toHaveLength(1);
  });

  it('removes a review on explicit moderator action and drops it from public listings', async () => {
    const propertyId = await createProperty();
    const reviewId = await submitReview(propertyId, userToken);
    await request(
      'POST',
      `/api/v1/moderation/reviews/${reviewId}/decision`,
      { decision: 'PUBLISH' },
      adminToken,
    );

    const remove = await request(
      'POST',
      `/api/v1/moderation/reviews/${reviewId}/decision`,
      { decision: 'REMOVE', note: 'Contains personal information.' },
      adminToken,
    );
    expect(remove.json<{ data: { status: string } }>().data.status).toBe('REMOVED');

    const publicList = await request('GET', `/api/v1/properties/${propertyId}/reviews`);
    expect(publicList.json<{ data: unknown[] }>().data).toHaveLength(0);

    // An audit entry exists for the removal.
    const audits = await prisma.auditLog.findMany({
      where: { entityType: 'Review', entityId: reviewId, action: 'REVIEW_REMOVE' },
    });
    expect(audits.length).toBe(1);
  });

  it('supports the appeal flow: resident appeals a removal, moderator grants it', async () => {
    const propertyId = await createProperty();
    const reviewId = await submitReview(propertyId, userToken);
    await request(
      'POST',
      `/api/v1/moderation/reviews/${reviewId}/decision`,
      { decision: 'PUBLISH' },
      adminToken,
    );
    await request(
      'POST',
      `/api/v1/moderation/reviews/${reviewId}/decision`,
      { decision: 'REMOVE' },
      adminToken,
    );

    const appeal = await request(
      'POST',
      `/api/v1/reviews/${reviewId}/appeal`,
      { reason: 'The information was not personal; please re-review.' },
      userToken,
    );
    expect(appeal.statusCode).toBe(202);

    // Only the author can appeal.
    const otherToken = (await registerUser(app)).token;
    const otherAppeal = await request(
      'POST',
      `/api/v1/reviews/${reviewId}/appeal`,
      { reason: 'not mine' },
      otherToken,
    );
    expect(otherAppeal.statusCode).toBe(404);

    const grant = await request(
      'POST',
      `/api/v1/moderation/reviews/${reviewId}/appeal-decision`,
      { decision: 'GRANT' },
      adminToken,
    );
    expect(grant.json<{ data: { status: string } }>().data.status).toBe('PUBLISHED');
  });

  it('rejects an invalid transition (publishing a removed review)', async () => {
    const propertyId = await createProperty();
    const reviewId = await submitReview(propertyId, userToken);
    await request(
      'POST',
      `/api/v1/moderation/reviews/${reviewId}/decision`,
      { decision: 'PUBLISH' },
      adminToken,
    );
    await request(
      'POST',
      `/api/v1/moderation/reviews/${reviewId}/decision`,
      { decision: 'REMOVE' },
      adminToken,
    );

    const bad = await request(
      'POST',
      `/api/v1/moderation/reviews/${reviewId}/decision`,
      { decision: 'PUBLISH' },
      adminToken,
    );
    expect(bad.statusCode).toBe(400);
    expect(bad.json<{ error: { code: string } }>().error.code).toBe('REVIEW_INVALID_STATE');

    expect(userId).toBeDefined();
  });
});
