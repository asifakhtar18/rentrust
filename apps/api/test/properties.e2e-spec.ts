import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './test-app';
import { ensureGeo, http, prisma, registerAdmin, registerUser } from './helpers';

describe('Properties (e2e)', () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof http>;
  let adminToken: string;
  let userToken: string;
  let localityId: string;

  beforeAll(async () => {
    app = await createTestApp();
    request = http(app);
    const geo = await ensureGeo();
    localityId = geo.localityId;
    adminToken = (await registerAdmin(app)).token;
    userToken = (await registerUser(app)).token;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const uniqueName = () =>
    `Prestige Lakeside ${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  it('forbids non-admins from creating properties (RBAC server-side)', async () => {
    const res = await request(
      'POST',
      '/api/v1/properties',
      { displayName: uniqueName(), propertyType: 'APARTMENT', localityId },
      userToken,
    );
    expect(res.statusCode).toBe(403);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('FORBIDDEN');
  });

  it('requires auth to create a property', async () => {
    const res = await request('POST', '/api/v1/properties', {
      displayName: uniqueName(),
      propertyType: 'APARTMENT',
    });
    expect(res.statusCode).toBe(401);
  });

  it('creates a property as admin and exposes it publicly', async () => {
    const name = uniqueName();
    const create = await request(
      'POST',
      '/api/v1/properties',
      {
        displayName: name,
        propertyType: 'APARTMENT',
        aliases: ['Prestige Lakeside', 'Prestige Lakeside Habitat'],
        localityId,
        latitude: 12.9279,
        longitude: 77.6271,
        developer: 'Prestige Group',
        yearBuilt: 2018,
        amenities: ['Pool', 'Gym'],
      },
      adminToken,
    );
    expect(create.statusCode).toBe(201);
    const property = create.json<{ data: { id: string; slug: string; canonicalName: string } }>()
      .data;
    expect(property.canonicalName).toBe(name.toLowerCase());

    // Public detail, no auth.
    const detail = await request('GET', `/api/v1/properties/${property.id}`);
    expect(detail.statusCode).toBe(200);
    const body = detail.json<{ data: { displayName: string; reviewCount: number } }>().data;
    expect(body.displayName).toBe(name);
    expect(body.reviewCount).toBe(0);
  });

  it('rejects a duplicate canonical name in the same locality', async () => {
    const name = uniqueName();
    const payload = { displayName: name, propertyType: 'APARTMENT', localityId };
    const first = await request('POST', '/api/v1/properties', payload, adminToken);
    expect(first.statusCode).toBe(201);

    const dup = await request('POST', '/api/v1/properties', payload, adminToken);
    expect(dup.statusCode).toBe(409);
    expect(dup.json<{ error: { code: string } }>().error.code).toBe('PROPERTY_ALREADY_EXISTS');
  });

  it('finds nearby properties ordered by distance (PostGIS)', async () => {
    // Create a near property (~2.2km from HSR centre) and a far one.
    await request(
      'POST',
      '/api/v1/properties',
      {
        displayName: uniqueName(),
        propertyType: 'APARTMENT',
        localityId,
        latitude: 12.9279,
        longitude: 77.6271,
      },
      adminToken,
    );

    const res = await request(
      'GET',
      '/api/v1/properties/nearby?latitude=12.9116&longitude=77.6389&radiusMeters=5000&limit=50',
    );
    expect(res.statusCode).toBe(200);
    const rows = res.json<{ data: Array<{ distanceMeters: number }> }>().data;
    expect(rows.length).toBeGreaterThan(0);
    // Distances must be sorted ascending.
    const distances = rows.map((r) => r.distanceMeters);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
    expect(distances.every((d) => d <= 5000)).toBe(true);
  });

  it('paginates the property list with a cursor', async () => {
    const page1 = await request('GET', '/api/v1/properties?limit=2');
    expect(page1.statusCode).toBe(200);
    const body1 = page1.json<{
      data: unknown[];
      meta: { nextCursor: string | null; hasMore: boolean };
    }>();
    expect(body1.data.length).toBeLessThanOrEqual(2);
    if (body1.meta.hasMore) {
      const page2 = await request(
        'GET',
        `/api/v1/properties?limit=2&cursor=${encodeURIComponent(body1.meta.nextCursor!)}`,
      );
      expect(page2.statusCode).toBe(200);
    }
  });

  it('returns PROPERTY_NOT_FOUND for an unknown id', async () => {
    const res = await request('GET', '/api/v1/properties/00000000-0000-0000-0000-000000000000');
    expect(res.statusCode).toBe(404);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('PROPERTY_NOT_FOUND');
  });
});
