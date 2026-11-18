/**
 * The post-login destination, restricted to same-origin paths.
 *
 * A value must start with a single "/". Protocol-relative URLs ("//evil.com")
 * and their backslash variant ("/\evil.com", which browsers treat the same)
 * would leave the site, so they fall back to "/". Control characters are
 * rejected too: browsers strip tabs and newlines, turning "/\t/evil.com" into
 * "//evil.com".
 */
export function safeNext(next: unknown): string | null {
  if (typeof next !== 'string' || !next.startsWith('/')) return null;
  if (next.startsWith('//') || next.startsWith('/\\')) return null;
  if (/[\u0000-\u001f\u007f]/.test(next)) return null;
  return next;
}
