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

/**
 * First visit: / redirects to /welcome once. The cookie is set on that
 * redirect and on any visit to /welcome, so the dashboard never loads twice
 * (the old client-side redirect rendered / and then replaced it).
 * Bump the value to show /welcome again to everyone.
 */
const ONBOARDED_COOKIE = 'mf_onboarded';
const ONBOARDED_VALUE = '3';
const ONE_YEAR = 60 * 60 * 24 * 365;

function onboarding(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const seen = request.cookies.get(ONBOARDED_COOKIE)?.value === ONBOARDED_VALUE;
  // A link prefetch is not a visit: it must not set the cookie or redirect.
  const prefetch = request.headers.has('next-router-prefetch') || request.headers.get('purpose') === 'prefetch';
  if (seen || prefetch || (pathname !== '/' && pathname !== '/welcome')) return NextResponse.next();

  const response =
    pathname === '/' ? NextResponse.redirect(new URL('/welcome', request.url)) : NextResponse.next();
  response.cookies.set(ONBOARDED_COOKIE, ONBOARDED_VALUE, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || MERCH_FLOW_DATA.test(pathname)) {
    return NextResponse.next();
  }

  const password = process.env.SITE_PASSWORD;
  const secret = process.env.SITE_SESSION_SECRET;
  if (!password || !secret) return onboarding(request);

  if (await verifySession(request.cookies.get(SESSION_COOKIE)?.value, secret)) {
    return onboarding(request);
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
