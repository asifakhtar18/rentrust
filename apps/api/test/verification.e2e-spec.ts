import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './test-app';
import { ensureGeo, http, prisma, registerAdmin, registerUser } from './helpers';

/**
 * Verification e2e. Validates the signed-upload flow, the admin decision path,
 * that approving a verification flips the linked review to verified, and the
 * privacy invariants: storage keys / document URLs are never returned to
 * owners or on public surfaces, and document download is moderator/admin only.
 */
describe('Verification (e2e)', () => {
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
        displayName: `Verify Target ${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        propertyType: 'APARTMENT',
        localityId,
      },
      adminToken,
    );
    return res.json<{ data: { id: string } }>().data.id;
  }

  async function submitReview(propertyId: string): Promise<string> {
    const res = await request(
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

  it('issues a presigned upload URL scoped to the user', async () => {
    const res = await request(
      'POST',
      '/api/v1/verifications/upload-url',
      { contentType: 'application/pdf', sizeBytes: 1024 },
      userToken,
    );
    expect(res.statusCode).toBe(200);
    const data = res.json<{ data: { key: string; uploadUrl: string } }>().data;
    expect(data.key).toContain(`verification/${userId}/`);
    expect(data.uploadUrl).toEqual(expect.any(String));
  });

  it('rejects a disallowed content type', async () => {
    const res = await request(
      'POST',
      '/api/v1/verifications/upload-url',
      { contentType: 'application/x-msdownload', sizeBytes: 1024 },
      userToken,
    );
    expect(res.statusCode).toBe(422);
  });

  it('rejects attaching a document key that is not yours', async () => {
    const propertyId = await createProperty();
    const res = await request(
      'POST',
      '/api/v1/verifications',
      {
        propertyId,
        evidenceType: 'RENTAL_AGREEMENT',
        documents: [
          {
            storageKey: 'verification/someone-else/doc.pdf',
            contentType: 'application/pdf',
            sizeBytes: 1024,
          },
        ],
      },
      userToken,
    );
    expect(res.statusCode).toBe(403);
  });

  it('runs the full approve flow and flips the linked review to verified', async () => {
    const propertyId = await createProperty();
    const reviewId = await submitReview(propertyId);

    const upload = await request(
      'POST',
      '/api/v1/verifications/upload-url',
      { contentType: 'application/pdf', sizeBytes: 2048 },
      userToken,
    );
    const key = upload.json<{ data: { key: string } }>().data.key;

    const create = await request(
      'POST',
      '/api/v1/verifications',
      {
        propertyId,
        reviewId,
        evidenceType: 'RENTAL_AGREEMENT',
        documents: [{ storageKey: key, contentType: 'application/pdf', sizeBytes: 2048 }],
      },
      userToken,
    );
    expect(create.statusCode).toBe(201);
    const verificationId = create.json<{ data: { id: string; status: string } }>().data.id;
    expect(create.json<{ data: { status: string } }>().data.status).toBe('PENDING');

    // Owner status view must NOT leak storage keys / document URLs.
    const status = await request(
      'GET',
      `/api/v1/verifications/${verificationId}`,
      undefined,
      userToken,
    );
    const statusBody = JSON.stringify(status.json());
    expect(statusBody).not.toContain(key);
    expect(status.json<{ data: { documentCount: number } }>().data.documentCount).toBe(1);

    // Non-admin cannot see the moderator queue.
    const forbiddenQueue = await request(
      'GET',
      '/api/v1/verifications/admin/queue',
      undefined,
      userToken,
    );
    expect(forbiddenQueue.statusCode).toBe(403);

    // Admin approves.
    const decide = await request(
      'POST',
      `/api/v1/verifications/${verificationId}/decision`,
      { decision: 'VERIFIED' },
      adminToken,
    );
    expect(decide.statusCode).toBe(200);
    expect(decide.json<{ data: { status: string } }>().data.status).toBe('VERIFIED');

    // The linked review is now verified.
    const review = await prisma.review.findUniqueOrThrow({ where: { id: reviewId } });
    expect(review.isVerified).toBe(true);

    // An audit entry exists for the approval.
    const audits = await prisma.auditLog.findMany({
      where: {
        entityType: 'VerificationRequest',
        entityId: verificationId,
        action: 'VERIFICATION_APPROVED',
      },
    });
    expect(audits.length).toBe(1);
  });

  it('exposes document download only to moderators/admins and audits access', async () => {
    const propertyId = await createProperty();
    const upload = await request(
      'POST',
      '/api/v1/verifications/upload-url',
      { contentType: 'image/png', sizeBytes: 2048 },
      userToken,
    );
    const key = upload.json<{ data: { key: string } }>().data.key;
    const create = await request(
      'POST',
      '/api/v1/verifications',
      {
        propertyId,
        evidenceType: 'UTILITY_DOCUMENT',
        documents: [{ storageKey: key, contentType: 'image/png', sizeBytes: 2048 }],
      },
      userToken,
    );
    const verificationId = create.json<{ data: { id: string } }>().data.id;
    const doc = await prisma.verificationDocument.findFirstOrThrow({
      where: { request: { id: verificationId } },
    });

    // Owner (plain user) must not download.
    const forbidden = await request(
      'GET',
      `/api/v1/verifications/admin/documents/${doc.id}/download`,
      undefined,
      userToken,
    );
    expect(forbidden.statusCode).toBe(403);

    // Admin can get a short-lived signed URL.
    const allowed = await request(
      'GET',
      `/api/v1/verifications/admin/documents/${doc.id}/download`,
      undefined,
      adminToken,
    );
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json<{ data: { downloadUrl: string } }>().data.downloadUrl).toEqual(
      expect.any(String),
    );

    const access = await prisma.auditLog.findMany({
      where: {
        entityType: 'VerificationDocument',
        entityId: doc.id,
        action: 'VERIFICATION_DOCUMENT_ACCESSED',
      },
    });
    expect(access.length).toBe(1);
  });
});
