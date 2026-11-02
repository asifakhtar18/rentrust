/**
 * Centralised, strongly-typed application configuration.
 *
 * Why: configuration must never be hard-coded across the codebase. This module
 * is the single source of truth that reads from the environment once, applies
 * sane development defaults, and exposes a typed object the rest of the app
 * consumes via `ConfigService<AppConfig, true>`.
 */

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  /** Public base URL of the web app, used to build links in emails. */
  appUrl: string;
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  queue: {
    driver: 'inline' | 'bullmq';
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  storage: {
    // 's3' uses Cloudflare R2's S3-compatible API.
    driver: 'mock' | 's3';
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    forcePathStyle: boolean;
    signedUrlTtlSeconds: number;
  };
  email: {
    driver: 'console' | 'smtp';
    from: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure: boolean;
    smtpUser?: string;
    smtpPassword?: string;
  };
  trustScore: {
    minReviewsForFullConfidence: number;
  };
  throttle: {
    ttlSeconds: number;
    limit: number;
  };
}

function requireInProduction(key: string, value: string | undefined, fallback: string): string {
  if (value && value.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      if (value === fallback || /(?:replace|change-me|dev[-_])/i.test(value)) {
        throw new Error(`Insecure placeholder value is not allowed in production: ${key}`);
      }
      if (key.endsWith('_SECRET') && value.length < 32) {
        throw new Error(`${key} must be at least 32 characters in production.`);
      }
    }
    return value;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable in production: ${key}`);
  }
  return fallback;
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw || raw.trim().length === 0) {
    return ['http://localhost:3000'];
  }
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export default (): AppConfig => {
  const env = (process.env.NODE_ENV as AppConfig['env']) ?? 'development';
  const storageDriver = (process.env.STORAGE_DRIVER as AppConfig['storage']['driver']) ?? 'mock';
  const emailDriver = (process.env.EMAIL_DRIVER as AppConfig['email']['driver']) ?? 'console';
  const databaseUrl =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    'postgresql://rentrust:rentrust@localhost:5432/rentrust?schema=public';
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const corsOrigins = parseOrigins(process.env.CORS_ORIGINS);
  const appUrl = requireInProduction(
    'APP_URL',
    process.env.APP_URL ?? corsOrigins[0],
    'http://localhost:3000',
  ).replace(/\/$/, '');

  // These development adapters intentionally do not persist files or deliver
  // email. Fail at startup instead of silently accepting production traffic.
  if (env === 'production' && storageDriver === 'mock') {
    throw new Error(
      'STORAGE_DRIVER=mock is not allowed in production. Configure S3-compatible storage.',
    );
  }
  if (env === 'production' && emailDriver === 'console') {
    throw new Error('EMAIL_DRIVER=console is not allowed in production. Configure SMTP delivery.');
  }
  if (env === 'production') {
    requireInProduction(
      'DATABASE_URL or POSTGRES_PRISMA_URL',
      process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL,
      '',
    );
    requireInProduction('REDIS_URL', process.env.REDIS_URL, '');
    if (!process.env.CORS_ORIGINS || corsOrigins.some((origin) => !origin.startsWith('https://'))) {
      throw new Error('Set CORS_ORIGINS to HTTPS web origins in production.');
    }
    let appOrigin: string;
    try {
      appOrigin = new URL(appUrl).origin;
    } catch {
      throw new Error('APP_URL must be a valid absolute URL in production.');
    }
    if (!corsOrigins.includes(appOrigin)) {
      throw new Error('CORS_ORIGINS must include the origin configured by APP_URL.');
    }
    if (storageDriver === 's3') {
      requireInProduction('STORAGE_ENDPOINT', process.env.STORAGE_ENDPOINT, '');
      requireInProduction('STORAGE_BUCKET', process.env.STORAGE_BUCKET, '');
      requireInProduction('STORAGE_ACCESS_KEY_ID', process.env.STORAGE_ACCESS_KEY_ID, '');
      requireInProduction('STORAGE_SECRET_ACCESS_KEY', process.env.STORAGE_SECRET_ACCESS_KEY, '');
      if (!process.env.STORAGE_ENDPOINT?.startsWith('https://')) {
        throw new Error('STORAGE_ENDPOINT must use HTTPS in production.');
      }
    }
    requireInProduction('SMTP_HOST', process.env.SMTP_HOST, '');
    requireInProduction('SMTP_USER', process.env.SMTP_USER, '');
    requireInProduction('SMTP_PASSWORD', process.env.SMTP_PASSWORD, '');
    requireInProduction('EMAIL_FROM', process.env.EMAIL_FROM, '');
    if (process.env.EMAIL_FROM?.includes('.local')) {
      throw new Error('EMAIL_FROM must use a verified sender domain in production.');
    }
  }

  return {
    env,
    port: parseInt(process.env.PORT ?? '4000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    corsOrigins,
    // Where the web app lives, for links in emails. Falls back to the first
    // configured CORS origin, then localhost in dev.
    appUrl,
    database: {
      url: databaseUrl,
    },
    redis: {
      url: redisUrl,
    },
    queue: {
      // The default works on Vercel and with managed Redis plans that cannot
      // guarantee BullMQ's noeviction requirement. Persistent Node deployments
      // can opt into BullMQ explicitly.
      driver: (process.env.TRUST_SCORE_QUEUE_DRIVER as AppConfig['queue']['driver']) ?? 'inline',
    },
    jwt: {
      accessSecret: requireInProduction(
        'JWT_ACCESS_SECRET',
        process.env.JWT_ACCESS_SECRET,
        'dev-access-secret-change-me',
      ),
      refreshSecret: requireInProduction(
        'JWT_REFRESH_SECRET',
        process.env.JWT_REFRESH_SECRET,
        'dev-refresh-secret-change-me',
      ),
      accessTtl: process.env.JWT_ACCESS_TTL ?? '900s',
      refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
    },
    storage: {
      driver: storageDriver,
      // Cloudflare R2 S3 endpoint: https://<accountid>.r2.cloudflarestorage.com
      endpoint: process.env.STORAGE_ENDPOINT,
      // R2 ignores region but the SDK requires one; 'auto' is the R2 convention.
      region: process.env.STORAGE_REGION ?? 'auto',
      bucket: process.env.STORAGE_BUCKET ?? 'rentrust-documents',
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
      // R2 uses path-style addressing with the S3-compatible endpoint.
      forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? 'true') === 'true',
      signedUrlTtlSeconds: parseInt(process.env.STORAGE_SIGNED_URL_TTL ?? '900', 10),
    },
    email: {
      driver: emailDriver,
      from: process.env.EMAIL_FROM ?? 'RenTrust <no-reply@rentrust.local>',
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
      // true for port 465 (implicit TLS); false for 587/25 (STARTTLS). Can be
      // overridden explicitly via SMTP_SECURE.
      smtpSecure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === 'true'
        : process.env.SMTP_PORT === '465',
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
    },
    trustScore: {
      minReviewsForFullConfidence: parseInt(process.env.TRUST_SCORE_MIN_REVIEWS ?? '30', 10),
    },
    throttle: {
      ttlSeconds: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
    },
  };
};
