import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './test-app';
import { ensureGeo, http, prisma, registerAdmin } from './helpers';

/**
 * Search e2e. Exercises the PostgreSQL provider across exact, prefix, fuzzy
 * (typo-tolerant), alias, locality, type-filtered, and geo-filtered queries.
 */
describe('Search (e2e)', () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof http>;
  let adminToken: string;
  let localityId: string;
  let unique: string;

  type Hit = { type: string; id: string; title: string; distanceMeters?: number };

  beforeAll(async () => {
    app = await createTestApp();
    request = http(app);
    localityId = (await ensureGeo()).localityId;
    adminToken = (await registerAdmin(app)).token;
    unique = Math.random().toString(36).slice(2, 7);

    // A searchable property with aliases + coordinates near HSR Layout.
    await request(
      'POST',
      '/api/v1/properties',
      {
        displayName: `Prestige Lakeside Habitat ${unique}`,
        propertyType: 'APARTMENT',
        aliases: [`Lakeside ${unique}`, `PLH ${unique}`],
        localityId,
        latitude: 12.9279,
        longitude: 77.6271,
        developer: 'Prestige Group',
      },
      adminToken,
    );
    // A landlord to find by name.
    await prisma.landlord.create({
      data: {
        displayName: `Rajesh Kumar ${unique}`,
        slug: `rajesh-${unique}`,
        aliases: [`R Kumar ${unique}`],
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const run = (qs: string) => request('GET', `/api/v1/search?${qs}`);

  it('finds a property by exact name', async () => {
    const res = await run(`q=${encodeURIComponent(`Prestige Lakeside Habitat ${unique}`)}`);
    expect(res.statusCode).toBe(200);
    const hits = res.json<{ data: Hit[] }>().data;
    expect(hits.some((h) => h.type === 'property' && h.title.includes(unique))).toBe(true);
  });

  it('finds a property by prefix', async () => {
    const res = await run(`q=${encodeURIComponent('Prestige')}&types=property`);
    const hits = res.json<{ data: Hit[] }>().data;
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.type === 'property')).toBe(true);
  });

  it('tolerates typos via trigram similarity (fuzzy)', async () => {
    // "Prestge" is missing an 'i'.
    const res = await run(`q=${encodeURIComponent('Prestge Lakeside')}&types=property`);
    const hits = res.json<{ data: Hit[] }>().data;
    expect(hits.some((h) => h.title.includes('Prestige Lakeside'))).toBe(true);
  });

  it('finds a property by alias', async () => {
    const res = await run(`q=${encodeURIComponent(`PLH ${unique}`)}&types=property`);
    const hits = res.json<{ data: Hit[] }>().data;
    expect(hits.some((h) => h.title.includes(unique))).toBe(true);
  });

  it('finds a landlord by name', async () => {
    const res = await run(`q=${encodeURIComponent(`Rajesh ${unique}`)}&types=landlord`);
    const hits = res.json<{ data: Hit[] }>().data;
    expect(hits.some((h) => h.type === 'landlord' && h.title.includes('Rajesh'))).toBe(true);
  });

  it('finds a locality by name', async () => {
    const res = await run(`q=${encodeURIComponent('HSR')}&types=locality`);
    const hits = res.json<{ data: Hit[] }>().data;
    expect(hits.some((h) => h.type === 'locality')).toBe(true);
  });

  it('respects the type filter', async () => {
    const res = await run(`q=${encodeURIComponent(unique)}&types=landlord`);
    const hits = res.json<{ data: Hit[] }>().data;
    expect(hits.every((h) => h.type === 'landlord')).toBe(true);
  });

  it('returns geo distances when coordinates are supplied', async () => {
    const res = await run(
      `q=${encodeURIComponent('Prestige')}&types=property&latitude=12.9116&longitude=77.6389&radiusMeters=10000`,
    );
    const hits = res.json<{ data: Hit[] }>().data;
    const withDistance = hits.find((h) => h.distanceMeters !== undefined);
    expect(withDistance).toBeDefined();
    expect(withDistance!.distanceMeters).toBeGreaterThan(0);
  });

  it('returns an empty list for a blank query', async () => {
    const res = await run('q=%20');
    expect(res.statusCode).toBe(200);
    expect(res.json<{ data: Hit[] }>().data).toHaveLength(0);
  });
});
