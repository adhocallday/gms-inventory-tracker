import { NextResponse } from 'next/server';
import { SESSION_COOKIE, mintSession, sessionMaxAge } from '@/lib/auth/site-password';
import { safeNext } from '@/lib/auth/safe-next';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const form = await request.formData();
  const submitted = String(form.get('password') ?? '');
  const next = safeNext(String(form.get('next') ?? '/'));

  const password = process.env.SITE_PASSWORD;
  const secret = process.env.SITE_SESSION_SECRET;

  if (!password || !secret) {
    return NextResponse.redirect(new URL('/', request.url), { status: 303 });
  }

  if (submitted !== password) {
    const retry = new URL('/login', request.url);
    retry.searchParams.set('error', '1');
    // Only same-origin paths, so the error page cannot be used as an open redirect.
    if (next) retry.searchParams.set('next', next);
    return NextResponse.redirect(retry, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(next ?? '/', request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE, await mintSession(secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionMaxAge,
  });
  return response;
}
