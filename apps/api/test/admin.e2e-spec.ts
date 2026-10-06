import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './test-app';
import { ensureGeo, http, prisma, registerAdmin, registerUser } from './helpers';

/**
 * Admin e2e. Covers RBAC on the whole admin surface, dashboard metrics,
 * user/landlord/manager management, CSV import (dry-run + real with per-row
 * errors), and score-weight settings.
 */
describe('Admin (e2e)', () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof http>;
  let adminToken: string;
  let userToken: string;
  let targetUserId: string;
  let localityId: string;

  beforeAll(async () => {
    app = await createTestApp();
    request = http(app);
    localityId = (await ensureGeo()).localityId;
    adminToken = (await registerAdmin(app)).token;
    const u = await registerUser(app);
    userToken = u.token;
    targetUserId = u.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('forbids non-admins from the admin surface', async () => {
    const res = await request('GET', '/api/v1/admin/dashboard', undefined, userToken);
    expect(res.statusCode).toBe(403);
  });

  it('returns dashboard metrics', async () => {
    const res = await request('GET', '/api/v1/admin/dashboard', undefined, adminToken);
    expect(res.statusCode).toBe(200);
    const d = res.json<{ data: Record<string, number> }>().data;
    for (const key of [
      'users',
      'verifiedResidents',
      'reviews',
      'properties',
      'pendingModeration',
      'activeCities',
    ]) {
      expect(typeof d[key]).toBe('number');
    }
    expect(d.activeCities).toBeGreaterThanOrEqual(1);
  });

  it('lists users and updates roles + status', async () => {
    const list = await request('GET', '/api/v1/admin/users?pageSize=5', undefined, adminToken);
    expect(list.statusCode).toBe(200);
    expect(list.json<{ meta: { total: number } }>().meta.total).toBeGreaterThan(0);

    const roles = await request(
      'PUT',
      `/api/v1/admin/users/${targetUserId}/roles`,
      { roles: ['USER', 'MODERATOR'] },
      adminToken,
    );
    expect(roles.statusCode).toBe(200);
    expect(roles.json<{ data: { roles: string[] } }>().data.roles).toContain('MODERATOR');

    const status = await request(
      'PUT',
      `/api/v1/admin/users/${targetUserId}/status`,
      { status: 'SUSPENDED' },
      adminToken,
    );
    expect(status.json<{ data: { status: string } }>().data.status).toBe('SUSPENDED');
  });

  it('creates and lists landlords and managers', async () => {
    const landlord = await request(
      'POST',
      '/api/v1/admin/landlords',
      { displayName: `Prestige Group ${Date.now()}`, isCompany: true },
      adminToken,
    );
    expect(landlord.statusCode).toBe(201);

    const manager = await request(
      'POST',
      '/api/v1/admin/managers',
      { displayName: `Nest Mgmt ${Date.now()}`, company: 'Nest' },
      adminToken,
    );
    expect(manager.statusCode).toBe(201);

    const list = await request('GET', '/api/v1/admin/landlords', undefined, adminToken);
    expect(list.json<{ data: unknown[] }>().data.length).toBeGreaterThan(0);
  });

  it('validates a CSV import in dry-run without persisting', async () => {
    const csv = [
      'display_name,property_type,year_built',
      `DryRun Tower ${Date.now()},APARTMENT,2019`,
      'Bad Row,NOT_A_TYPE,3000',
    ].join('\n');

    const res = await request(
      'POST',
      '/api/v1/admin/properties/import',
      { csv, localityId, dryRun: true },
      adminToken,
    );
    expect(res.statusCode).toBe(200);
    const r = res.json<{ data: { createdCount: number; validRows: number; issues: unknown[] } }>()
      .data;
    expect(r.createdCount).toBe(0); // dry run persists nothing
    expect(r.validRows).toBe(1);
    expect(r.issues.length).toBe(1); // the bad row
  });

  it('imports valid CSV rows for real', async () => {
    const name = `Imported Habitat ${Date.now()}`;
    const csv = ['display_name,property_type', `${name},VILLA`].join('\n');
    const res = await request(
      'POST',
      '/api/v1/admin/properties/import',
      { csv, localityId },
      adminToken,
    );
    const r = res.json<{ data: { createdCount: number; createdIds: string[] } }>().data;
    expect(r.createdCount).toBe(1);

    const created = await prisma.property.findUniqueOrThrow({ where: { id: r.createdIds[0] } });
    expect(created.displayName).toBe(name);
  });

  it('creates and activates a new score-weight configuration', async () => {
    const res = await request(
      'PUT',
      '/api/v1/admin/settings/score-weights',
      {
        name: `custom-${Date.now()}`,
        weights: {
          management: 0.3,
          maintenance: 0.15,
          deposit: 0.1,
          communication: 0.1,
          safety: 0.1,
          condition: 0.1,
          rules: 0.075,
          experience: 0.075,
        },
        activate: true,
      },
      adminToken,
    );
    expect(res.statusCode).toBe(200);

    // Exactly one active config (single-active invariant upheld).
    const activeCount = await prisma.scoreConfiguration.count({ where: { isActive: true } });
    expect(activeCount).toBe(1);
  });
});
