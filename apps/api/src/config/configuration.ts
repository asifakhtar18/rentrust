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
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  storage: {
    // 's3' covers any S3-compatible store (AWS S3, Cloudflare R2, MinIO).
    driver: 'mock' | 's3';
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    forcePathStyle: boolean;
    signedUrlTtlSeconds: number;
  };
  imageCompression: {
    enabled: boolean;
    maxWidth: number;
    maxHeight: number;
    quality: number;
  };
  email: {
    driver: 'console' | 'smtp';
    from: string;
    smtpHost?: string;
    smtpPort?: number;
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

  return {
    env,
    port: parseInt(process.env.PORT ?? '4000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
    database: {
      url:
        process.env.DATABASE_URL ??
        'postgresql://rentrust:rentrust@localhost:5432/rentrust?schema=public',
    },
    redis: {
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
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
      driver: (process.env.STORAGE_DRIVER as AppConfig['storage']['driver']) ?? 'mock',
      // Cloudflare R2 example: https://<accountid>.r2.cloudflarestorage.com
      endpoint: process.env.STORAGE_ENDPOINT,
      // R2 ignores region but the SDK requires one; 'auto' is the R2 convention.
      region: process.env.STORAGE_REGION ?? 'auto',
      bucket: process.env.STORAGE_BUCKET ?? 'rentrust-documents',
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
      // R2 and MinIO use path-style addressing.
      forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? 'true') === 'true',
      signedUrlTtlSeconds: parseInt(process.env.STORAGE_SIGNED_URL_TTL ?? '900', 10),
    },
    imageCompression: {
      enabled: (process.env.IMAGE_COMPRESSION_ENABLED ?? 'true') === 'true',
      maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH ?? '2000', 10),
      maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT ?? '2000', 10),
      quality: parseInt(process.env.IMAGE_QUALITY ?? '80', 10),
    },
    email: {
      driver: (process.env.EMAIL_DRIVER as AppConfig['email']['driver']) ?? 'console',
      from: process.env.EMAIL_FROM ?? 'RentTrust <no-reply@rentrust.local>',
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
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
