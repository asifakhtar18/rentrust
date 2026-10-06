import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaClient, UserRole } from '@prisma/client';

/**
 * Shared e2e helpers. A single PrismaClient is used for direct DB setup
 * (promoting a user to admin, seeding geography) that bypasses the HTTP layer.
 */
export const prisma = new PrismaClient();

export interface Injected {
  statusCode: number;
  json: <T = unknown>() => T;
}

export function http(app: NestFastifyApplication) {
  return (
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    url: string,
    payload?: unknown,
    token?: string,
  ) =>
    app.inject({
      method,
      url,
      payload: payload as object,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
}

/** Registers a user via the API and returns their access token + id. */
export async function registerUser(
  app: NestFastifyApplication,
): Promise<{ token: string; email: string; id: string }> {
  const email = `e2e_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: 'Str0ngPassphrase1' },
  });
  const token = res.json<{ data: { accessToken: string } }>().data.accessToken;
  const user = await prisma.user.findFirstOrThrow({ where: { email } });
  return { token, email, id: user.id };
}

/**
 * Registers a user and promotes them to ADMIN, then logs in again so the fresh
 * access token carries the ADMIN role in its claims.
 */
export async function registerAdmin(
  app: NestFastifyApplication,
): Promise<{ token: string; id: string }> {
  const { id, email } = await registerUser(app);
  await prisma.user.update({ where: { id }, data: { roles: [UserRole.USER, UserRole.ADMIN] } });
  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password: 'Str0ngPassphrase1' },
  });
  const token = login.json<{ data: { accessToken: string } }>().data.accessToken;
  return { token, id };
}

/** Ensures a Country/State/City/Locality exist, returning their ids. */
export async function ensureGeo(): Promise<{ cityId: string; localityId: string }> {
  const country = await prisma.country.upsert({
    where: { iso2: 'IN' },
    update: {},
    create: { name: 'India', iso2: 'IN' },
  });
  const state =
    (await prisma.state.findFirst({ where: { countryId: country.id, name: 'Karnataka' } })) ??
    (await prisma.state.create({ data: { countryId: country.id, name: 'Karnataka' } }));
  const city =
    (await prisma.city.findFirst({ where: { stateId: state.id, name: 'Bengaluru' } })) ??
    (await prisma.city.create({
      data: {
        stateId: state.id,
        countryId: country.id,
        name: 'Bengaluru',
        slug: `bengaluru-${Math.random().toString(36).slice(2, 6)}`,
      },
    }));
  const locality =
    (await prisma.locality.findFirst({ where: { cityId: city.id, name: 'HSR Layout' } })) ??
    (await prisma.locality.create({
      data: {
        cityId: city.id,
        name: 'HSR Layout',
        slug: `hsr-layout-${Math.random().toString(36).slice(2, 6)}`,
        latitude: 12.9116,
        longitude: 77.6389,
      },
    }));
  return { cityId: city.id, localityId: locality.id };
}
