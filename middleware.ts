import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/site-password';

/**
 * Site-wide password gate, the same approach as MerchFlow Charts.
 *
 * Vercel's Password Protection is Pro-only, so the gate lives here. Unset
 * SITE_PASSWORD / SITE_SESSION_SECRET (local development) leaves the site open.
 */

const PUBLIC_PREFIXES = [
  '/login',
  '/api/login',
  '/_next',
  // Icons, manifest and the demo video, so the login page and home-screen
  // clip render and the Data Flow site can embed the video.
  '/favicon',
  '/icon',
  '/apple-icon',
  '/site.webmanifest',
  '/pos-demo.mp4',
  // Called by the MerchFlow POS iPad app, which has no browser session.
  '/api/parse-document',
];

// Server-to-server link from MerchFlow Charts; protected by MERCHFLOW_LINK_SECRET.
const MERCH_FLOW_DATA = /^\/api\/tours\/[^/]+\/merch-flow-data$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || MERCH_FLOW_DATA.test(pathname)) {
    return NextResponse.next();
  }

  const password = process.env.SITE_PASSWORD;
  const secret = process.env.SITE_SESSION_SECRET;
  if (!password || !secret) return NextResponse.next();

  if (await verifySession(request.cookies.get(SESSION_COOKIE)?.value, secret)) {
    return NextResponse.next();
  }

  // API calls get a 401 instead of a login page.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const login = new URL('/login', request.url);
  login.searchParams.set('next', pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
