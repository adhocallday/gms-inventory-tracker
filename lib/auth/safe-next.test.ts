import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('keeps same-origin paths', () => {
    expect(safeNext('/')).toBe('/');
    expect(safeNext('/new?tourId=abc&from=tracker')).toBe('/new?tourId=abc&from=tracker');
    expect(safeNext('/r/some-slug')).toBe('/r/some-slug');
  });

  it('rejects protocol-relative and backslash redirects', () => {
    expect(safeNext('//evil.com')).toBeNull();
    expect(safeNext('//evil.com/path')).toBeNull();
    expect(safeNext('/\\evil.com')).toBeNull();
    expect(safeNext('/\\/evil.com')).toBeNull();
  });

  it('rejects control characters that browsers strip', () => {
    expect(safeNext('/\t/evil.com')).toBeNull();
    expect(safeNext('/\n/evil.com')).toBeNull();
  });

  it('rejects absolute URLs and non-strings', () => {
    expect(safeNext('https://evil.com')).toBeNull();
    expect(safeNext('evil.com')).toBeNull();
    expect(safeNext(null)).toBeNull();
    expect(safeNext(undefined)).toBeNull();
  });
});
