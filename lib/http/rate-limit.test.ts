import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  it('allows `limit` hits per window per key, then resets', () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(check('a', 0).ok).toBe(true);
    expect(check('a', 10).ok).toBe(true);
    expect(check('a', 20)).toEqual({ ok: false, retryAfterSeconds: 1 });
    expect(check('b', 20).ok).toBe(true);
    expect(check('a', 1001).ok).toBe(true);
  });
});
