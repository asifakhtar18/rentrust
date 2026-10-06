import { NextResponse, type NextRequest } from 'next/server';

/*
 * Route protection middleware.
 *
 * This is a FIRST-LINE gate based on the presence of the httpOnly refresh
 * cookie ('rt'). It keeps anonymous visitors out of authenticated surfaces and
 * sends them to login with a `next` param so they return to where they were.
 *
 * It deliberately does NOT verify the token or check roles — that happens
 * server-side in the API (RBAC) and client-side in the pages themselves
 * (useAuth). The cookie is httpOnly and set only by our own BFF, so its mere
 * presence is a sound, cheap signal here. Admin role gating stays in the
 * client shell because the cookie alone can't tell us the user's roles.
 */

const PROTECTED_PREFIXES = ['/saved', '/profile', '/reviews/new', '/admin'];
const COOKIE_NAME = 'rt';

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  const hasSession = Boolean(req.cookies.get(COOKIE_NAME)?.value);
  if (hasSession) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run only on the protected trees; keeps middleware off public pages/assets.
  matcher: ['/saved/:path*', '/profile/:path*', '/reviews/new/:path*', '/admin/:path*'],
};
