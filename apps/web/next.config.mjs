/** @type {import('next').NextConfig} */
if (process.env.VERCEL === '1') {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!apiBaseUrl) {
    throw new Error('Set NEXT_PUBLIC_API_BASE_URL in the Vercel project before building.');
  }

  let parsedApiBaseUrl;
  try {
    parsedApiBaseUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must be an absolute HTTPS URL in Vercel.');
  }
  if (parsedApiBaseUrl.protocol !== 'https:' || parsedApiBaseUrl.username || parsedApiBaseUrl.password || parsedApiBaseUrl.search || parsedApiBaseUrl.hash) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must be an absolute HTTPS URL without credentials, query, or fragment.');
  }
  if (parsedApiBaseUrl.pathname.replace(/\/+$/, '') !== '/api/v1') {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must end with /api/v1.');
  }

  const bffProxySecret = process.env.BFF_PROXY_SECRET;
  if (!bffProxySecret || bffProxySecret.length < 32 || bffProxySecret.includes('replace')) {
    throw new Error('Set a unique BFF_PROXY_SECRET of at least 32 characters in the Vercel project before building.');
  }
}

export default {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    }];
  },
};
