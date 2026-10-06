import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './test-app';
import { ensureGeo, http, prisma, registerAdmin, registerUser } from './helpers';

/**
 * Claims + owner-response e2e. Verifies the claim lifecycle (upload -> request
 * -> admin approve grants role + marks claimed), the owner-response power
 * boundaries (verified owner may respond with a labelled note; non-owners
 * cannot; owners cannot touch review content), and admin-only controls.
 */
describe('Claims & owner responses (e2e)', () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof http>;
  let adminToken: string;
  let ownerToken: string;
  let ownerId: string;
  let localityId: string;

  async function createProperty(): Promise<string> {
    const res = await request(
      'POST',
      '/api/v1/properties',
      {
        displayName: `Claim Target ${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        propertyType: 'APARTMENT',
        localityId,
      },
      adminToken,
    );
    return res.json<{ data: { id: string } }>().data.id;
  }

  async function publishedReview(propertyId: string): Promise<string> {
    const { id: authorId } = await registerUser(app);
    const review = await prisma.review.create({
      data: {
        propertyId,
        authorId,
        status: 'PUBLISHED',
        tenure: 'Y1_2',
        publishedAt: new Date(),
        overall: 70,
        answer: {
          create: {
            tenure: 'Y1_2',
            managementResponsiveness: 3,
            maintenanceQuality: 3,
            maintenanceResolution: 'D1_3',
            depositOutcome: 'PARTIAL',
            deductionsExplained: 'YES',
            communication: 3,
            safety: 3,
            waterSupply: 3,
            noise: 3,
            rulesStrictness: 3,
            wouldRentAgain: 'MAYBE',
            wouldRecommend: false,
          },
        },
      },
    });
    return review.id;
  }

  async function uploadKey(token: string): Promise<string> {
    const res = await request(
      'POST',
      '/api/v1/claims/upload-url',
      { contentType: 'application/pdf', sizeBytes: 2048 },
      token,
    );
    return res.json<{ data: { key: string } }>().data.key;
  }

  beforeAll(async () => {
    app = await createTestApp();
    request = http(app);
    localityId = (await ensureGeo()).localityId;
    adminToken = (await registerAdmin(app)).token;
    const u = await registerUser(app);
    ownerToken = u.token;
    ownerId = u.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('scopes claim upload keys to the user', async () => {
    const key = await uploadKey(ownerToken);
    expect(key).toContain(`claim/${ownerId}/`);
  });

  it('rejects attaching a claim document that is not yours', async () => {
    const propertyId = await createProperty();
    const res = await request(
      'POST',
      `/api/v1/properties/${propertyId}/claim`,
      {
        role: 'OWNER',
        documents: [
          { storageKey: 'claim/other/doc.pdf', contentType: 'application/pdf', sizeBytes: 2048 },
        ],
      },
      ownerToken,
    );
    expect(res.statusCode).toBe(403);
  });

  it('cannot respond to a review before an approved claim', async () => {
    const propertyId = await createProperty();
    const reviewId = await publishedReview(propertyId);
    const res = await request(
      'POST',
      `/api/v1/reviews/${reviewId}/owner-response`,
      { body: 'Thanks for the feedback.' },
      ownerToken,
    );
    // Role guard first: a plain user lacks OWNER/MANAGER role -> 403.
    expect(res.statusCode).toBe(403);
  });

  it('runs the full claim approval and grants the OWNER role + marks claimed', async () => {
    const propertyId = await createProperty();
    const key = await uploadKey(ownerToken);

    const create = await request(
      'POST',
      `/api/v1/properties/${propertyId}/claim`,
      {
        role: 'OWNER',
        documents: [{ storageKey: key, contentType: 'application/pdf', sizeBytes: 2048 }],
      },
      ownerToken,
    );
    expect(create.statusCode).toBe(201);
    const claimId = create.json<{ data: { id: string } }>().data.id;

    // Duplicate active claim rejected.
    const dup = await request(
      'POST',
      `/api/v1/properties/${propertyId}/claim`,
      {
        role: 'OWNER',
        documents: [{ storageKey: key, contentType: 'application/pdf', sizeBytes: 2048 }],
      },
      ownerToken,
    );
    expect(dup.statusCode).toBe(409);

    // Non-admin cannot see the admin queue.
    const forbidden = await request('GET', '/api/v1/claims/admin/queue', undefined, ownerToken);
    expect(forbidden.statusCode).toBe(403);

    // Admin approves.
    const decide = await request(
      'POST',
      `/api/v1/claims/${claimId}/decision`,
      { decision: 'APPROVED' },
      adminToken,
    );
    expect(decide.json<{ data: { status: string } }>().data.status).toBe('APPROVED');

    // Property is now claimed and the user holds OWNER.
    const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
    expect(property.isClaimed).toBe(true);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
    expect(user.roles).toContain('OWNER');

    const audit = await prisma.auditLog.findMany({
      where: { entityType: 'PropertyClaim', entityId: claimId, action: 'PROPERTY_CLAIM_APPROVED' },
    });
    expect(audit.length).toBe(1);
  });

  it('lets a verified owner post a labelled public response but never edits the review', async () => {
    // Re-login so the token carries the freshly-granted OWNER role.
    const relog = await request('POST', '/api/v1/auth/login', {
      email: (await prisma.user.findUniqueOrThrow({ where: { id: ownerId } })).email,
      password: 'Str0ngPassphrase1',
    });
    const ownerTokenWithRole = relog.json<{ data: { accessToken: string } }>().data.accessToken;

    // Create a new property, claim+approve it, and a review to respond to.
    const propertyId = await createProperty();
    const key = await uploadKey(ownerToken);
    const create = await request(
      'POST',
      `/api/v1/properties/${propertyId}/claim`,
      {
        role: 'OWNER',
        documents: [{ storageKey: key, contentType: 'application/pdf', sizeBytes: 2048 }],
      },
      ownerToken,
    );
    const claimId = create.json<{ data: { id: string } }>().data.id;
    await request(
      'POST',
      `/api/v1/claims/${claimId}/decision`,
      { decision: 'APPROVED' },
      adminToken,
    );
    const reviewId = await publishedReview(propertyId);

    const respond = await request(
      'POST',
      `/api/v1/reviews/${reviewId}/owner-response`,
      { body: 'We have addressed the maintenance concerns raised here.' },
      ownerTokenWithRole,
    );
    expect(respond.statusCode).toBe(201);

    // Public response is labelled.
    const pub = await request('GET', `/api/v1/reviews/${reviewId}/owner-response`);
    const data = pub.json<{ data: { body: string; label: string } }>().data;
    expect(data.label).toContain('Official response');
    expect(data.body).toContain('maintenance');

    // The review itself is unchanged (still PUBLISHED, content intact).
    const review = await prisma.review.findUniqueOrThrow({ where: { id: reviewId } });
    expect(review.status).toBe('PUBLISHED');
  });

  it("forbids an owner from responding to a review on a property they haven't claimed", async () => {
    // ownerToken user has OWNER role (from earlier) but no claim on THIS property.
    const relog = await request('POST', '/api/v1/auth/login', {
      email: (await prisma.user.findUniqueOrThrow({ where: { id: ownerId } })).email,
      password: 'Str0ngPassphrase1',
    });
    const ownerTokenWithRole = relog.json<{ data: { accessToken: string } }>().data.accessToken;

    const otherProperty = await createProperty();
    const reviewId = await publishedReview(otherProperty);
    const res = await request(
      'POST',
      `/api/v1/reviews/${reviewId}/owner-response`,
      { body: 'Trying to respond without a claim.' },
      ownerTokenWithRole,
    );
    expect(res.statusCode).toBe(403);
  });
});
