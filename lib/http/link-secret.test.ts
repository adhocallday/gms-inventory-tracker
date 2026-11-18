import { describe, expect, it } from 'vitest';
import { isValidLinkSecret } from './link-secret';

describe('isValidLinkSecret', () => {
  it('accepts the exact secret', () => {
    expect(isValidLinkSecret('s3cret-value', 's3cret-value')).toBe(true);
  });

  it('rejects a wrong or differently sized secret', () => {
    expect(isValidLinkSecret('s3cret-valuE', 's3cret-value')).toBe(false);
    expect(isValidLinkSecret('s3cret', 's3cret-value')).toBe(false);
  });

  it('rejects when either side is missing', () => {
    expect(isValidLinkSecret(null, 's3cret-value')).toBe(false);
    expect(isValidLinkSecret('', 's3cret-value')).toBe(false);
    expect(isValidLinkSecret('anything', undefined)).toBe(false);
    expect(isValidLinkSecret('anything', '')).toBe(false);
  });
});
