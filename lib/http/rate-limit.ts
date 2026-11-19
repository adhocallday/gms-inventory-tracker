/**
 * A simple fixed-window rate limiter held in memory. On Vercel each warm
 * instance keeps its own counts, so this is a brake on bursts against a
 * public endpoint, not a global quota.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string, now = Date.now()): { ok: boolean; retryAfterSeconds: number } {
    // Drop expired windows so the map does not grow without bound.
    if (hits.size > 1000) {
      hits.forEach((v, k) => {
        if (v.resetAt <= now) hits.delete(k);
      });
    }
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, retryAfterSeconds: 0 };
    }
    entry.count += 1;
    return { ok: entry.count <= limit, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  };
}

/** Client IP as Vercel forwards it. */
export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
}
