import { createHash, timingSafeEqual } from 'crypto';

/** Header MerchFlow Charts sends when it reads tour data from the tracker. */
export const LINK_SECRET_HEADER = 'x-merchflow-link';

/**
 * Constant-time check of the shared MERCHFLOW_LINK_SECRET. Both sides are
 * hashed first so the comparison takes the same time whatever the lengths.
 * Returns false when the secret is not configured.
 */
export function isValidLinkSecret(provided: string | null, expected = process.env.MERCHFLOW_LINK_SECRET) {
  if (!expected || !provided) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}
