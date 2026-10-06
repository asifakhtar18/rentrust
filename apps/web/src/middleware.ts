import { NextRequest, NextResponse } from 'next/server';

/**
 * Route-protection middleware (UX only). It checks for the presence of the
 * refresh cookie to decide whether to send an anonymous visitor to the login
 * screen before rendering a gated page. Real authorization is always enforced
 * server-side by the API's RBAC guards — this never grants access on its own.
 */
const PROTECTED = [/^\/saved/, /^\/profile/, /^\/reviews\/new/, /^\/admin/];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some((re) => re.test(pathname));
  if (!needsAuth) return NextResponse.next();

  const hasSession = req.cookies.has('rt');
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/saved/:path*', '/profile/:path*', '/reviews/new/:path*', '/admin/:path*'],
};
