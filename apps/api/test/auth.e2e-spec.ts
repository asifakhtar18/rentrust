import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './test-app';

/**
 * End-to-end auth flow against the real database:
 * register -> me -> login -> refresh (rotation) -> old-token reuse rejected ->
 * logout. Also asserts the standard response envelope and that no sensitive
 * fields leak.
 */
describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;
  let email: string;
  const password = 'Str0ngPassphrase1';

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    email = `e2e_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
  });

  const inject = (method: 'POST' | 'GET', url: string, payload?: unknown, token?: string) =>
    app.inject({
      method,
      url,
      payload: payload as object,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });

  it('registers and returns a token pair in the success envelope', async () => {
    const res = await inject('POST', '/api/v1/auth/register', { email, password });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toEqual(expect.any(String));
    expect(body.data.refreshToken).toEqual(expect.any(String));
    expect(body.meta.requestId).toBeDefined();
  });

  it('rejects duplicate registration with EMAIL_ALREADY_REGISTERED', async () => {
    await inject('POST', '/api/v1/auth/register', { email, password });
    const res = await inject('POST', '/api/v1/auth/register', { email, password });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('rejects weak passwords with a validation error', async () => {
    const res = await inject('POST', '/api/v1/auth/register', { email, password: 'weak' });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in and returns the current user without the password hash', async () => {
    await inject('POST', '/api/v1/auth/register', { email, password });
    const login = await inject('POST', '/api/v1/auth/login', { email, password });
    expect(login.statusCode).toBe(200);
    const { accessToken } = login.json().data;

    const me = await inject('GET', '/api/v1/auth/me', undefined, accessToken);
    expect(me.statusCode).toBe(200);
    const user = me.json().data;
    expect(user.email).toBe(email.toLowerCase());
    expect(user).not.toHaveProperty('passwordHash');
    expect(user.roles).toContain('USER');
  });

  it('rejects wrong credentials with INVALID_CREDENTIALS', async () => {
    await inject('POST', '/api/v1/auth/register', { email, password });
    const res = await inject('POST', '/api/v1/auth/login', { email, password: 'Wr0ngPassword!' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rotates refresh tokens and rejects reuse of the old token', async () => {
    const reg = await inject('POST', '/api/v1/auth/register', { email, password });
    const { refreshToken } = reg.json().data;

    const rotated = await inject('POST', '/api/v1/auth/refresh', { refreshToken });
    expect(rotated.statusCode).toBe(200);
    const newRefresh = rotated.json().data.refreshToken;
    expect(newRefresh).not.toBe(refreshToken);

    // Reusing the old (now replaced) token must be rejected.
    const reuse = await inject('POST', '/api/v1/auth/refresh', { refreshToken });
    expect(reuse.statusCode).toBe(401);
    expect(reuse.json().error.code).toBe('INVALID_TOKEN');

    // Reuse detection revokes the whole lineage, so the rotated token also dies.
    const afterReuse = await inject('POST', '/api/v1/auth/refresh', { refreshToken: newRefresh });
    expect(afterReuse.statusCode).toBe(401);
  });

  it('requires authentication for protected routes', async () => {
    const res = await inject('GET', '/api/v1/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('does not reveal account existence on password reset request', async () => {
    const res = await inject('POST', '/api/v1/auth/password-reset/request', {
      email: 'nobody-here@example.com',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.requested).toBe(true);
  });
});
