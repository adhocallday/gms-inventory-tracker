import { describe, expect, it } from 'vitest';
import {
  flagDuplicateSkus,
  hammingHex,
  isAutoApprovable,
  matchTile,
  normaliseSku,
  suggestSku,
  verifyRead,
  type CatalogProduct,
} from './sku-match';

const catalog: CatalogProduct[] = [
  { id: 'cap', sku: 'GHOSNS103665BK', description: 'HAT', primaryImageId: 'img-cd', primaryImageHash: 'ffff0000ffff0000' },
  { id: 'shorts-bad', sku: 'GHOSRX203275B', description: 'Running Shorts (BLACK)', primaryImageId: 'img-cap' },
  { id: 'shorts', sku: 'GHOSRX203275BK', description: 'SHORTS BLACK/ WHT PAPA V COSTUME CLAWS', primaryImageId: null },
  { id: 'tee', sku: 'GHOSRX203729BK', description: 'SKELETOUR ITIN TEE', primaryImageId: 'img-tee', primaryImageHash: '0123456789abcdef' },
];

describe('normaliseSku', () => {
  it('pulls and repairs SKUs from captions', () => {
    expect(normaliseSku('GHOSRX103437OT')).toBe('GHOSRX103437OT');
    expect(normaliseSku('ghosrx 103437 0t')).toBe('GHOSRX103437OT');
    expect(normaliseSku('GHOSNS103665BK: Satanic Panic Cap')).toBe('GHOSNS103665BK');
    expect(normaliseSku('GH0SRX203801BK')).toBe('GHOSRX203801BK');
    expect(normaliseSku('GHOSRX203275B')).toBeNull();
    expect(normaliseSku('')).toBeNull();
  });
});

describe('verifyRead', () => {
  it('verifies when both reads normalise to the same SKU', () => {
    const v = verifyRead({ pageSku: 'GHOSRX103437OT', pageRaw: 'GHOSRX1034370T', cropRaw: 'GHOSRX103437OT', captionMatchesItem: true });
    expect(v.status).toBe('verified');
    expect(v.skuRead).toBe('GHOSRX103437OT');
  });
  it('sends a mismatch to review', () => {
    const v = verifyRead({ pageSku: 'GHOSRX203275BK', pageRaw: 'GHOSRX203275BK', cropRaw: 'GHOSNS103665BK', captionMatchesItem: true });
    expect(v.status).toBe('needs_review');
    expect(v.reason).toContain('GHOSNS103665BK');
  });
  it('sends an unreadable crop read to review', () => {
    expect(verifyRead({ pageSku: 'GHOSRX203729BK', pageRaw: 'x', cropRaw: '', captionMatchesItem: true }).status).toBe('needs_review');
  });
  it('sends a caption that does not describe the picture to review', () => {
    const v = verifyRead({ pageSku: 'GHOSNS103665BK', pageRaw: 'GHOSNS103665BK', cropRaw: 'GHOSNS103665BK', captionMatchesItem: false });
    expect(v.status).toBe('needs_review');
  });
  it('never verifies an invalid page SKU, even when reads agree', () => {
    const v = verifyRead({ pageSku: null, pageRaw: 'GHOSRX203275B', cropRaw: 'GHOSRX203275B', captionMatchesItem: true });
    expect(v.status).toBe('needs_review');
    expect(v.reason).toMatch(/both reads agree/);
  });
});

describe('matchTile', () => {
  it('matched: catalog SKU with no image', () => {
    const m = matchTile({ sku: 'GHOSRX203275BK', rawSku: 'GHOSRX203275BK' }, catalog);
    expect(m).toMatchObject({ status: 'matched', productId: 'shorts' });
  });
  it('matched: same picture as the current image', () => {
    const m = matchTile({ sku: 'GHOSRX203729BK', rawSku: 'GHOSRX203729BK', cropHash: '0123456789abcdee' }, catalog);
    expect(m.status).toBe('matched');
    expect(m.hashDistance).toBe(1);
  });
  it('conflict: a different primary image', () => {
    const m = matchTile({ sku: 'GHOSNS103665BK', rawSku: 'GHOSNS103665BK', cropHash: '0000ffff0000ffff' }, catalog);
    expect(m).toMatchObject({ status: 'conflict', existingImageId: 'img-cd' });
  });
  it('uses the closest of several existing-image hashes', () => {
    const cat = [{ ...catalog[0], primaryImageHash: 'ffff0000ffff0000,0000ffff0000fffe' }];
    const m = matchTile({ sku: 'GHOSNS103665BK', rawSku: 'GHOSNS103665BK', cropHash: '0000ffff0000ffff' }, cat);
    expect(m).toMatchObject({ status: 'matched', hashDistance: 1 });
  });
  it('conflict when the existing image could not be compared', () => {
    expect(matchTile({ sku: 'GHOSNS103665BK', rawSku: 'GHOSNS103665BK', cropHash: null }, catalog).status).toBe('conflict');
  });
  it('new: valid SKU not in the catalog', () => {
    expect(matchTile({ sku: 'GHOSRX999999BK', rawSku: 'GHOSRX999999BK' }, catalog)).toMatchObject({ status: 'new', productId: null });
  });
  it('unreadable, with a one-character suggestion for a malformed SKU', () => {
    const m = matchTile({ sku: null, rawSku: 'GHOSRX203275B' }, catalog);
    expect(m.status).toBe('unreadable');
    expect(m.suggestedSku).toBe('GHOSRX203275BK');
  });
  it('no suggestion when ambiguous or too short', () => {
    expect(suggestSku('GHOS', catalog)).toBeNull();
    expect(suggestSku('GHOSRX20372', [...catalog, { id: 'x', sku: 'GHOSRX203729', description: null }])).toBeNull();
  });
});

describe('helpers', () => {
  it('hamming distance on hex', () => {
    expect(hammingHex('ff', '00')).toBe(8);
    expect(hammingHex('abc', 'abc')).toBe(0);
    expect(hammingHex('a', 'ab')).toBe(8);
  });
  it('flags repeated SKUs after the first', () => {
    const v = { status: 'verified' as const, skuRead: null, rawRead: '', captionMatchesItem: true };
    const out = flagDuplicateSkus([
      { sku: 'A', verification: v },
      { sku: 'A', verification: v },
      { sku: null, verification: v },
    ]);
    expect(out.map((t) => t.verification.status)).toEqual(['verified', 'needs_review', 'verified']);
  });
  it('only verified + matched tiles are bulk-approvable', () => {
    const verified = { status: 'verified' as const, skuRead: 'A', rawRead: 'A', captionMatchesItem: true };
    expect(isAutoApprovable({ verification: verified, match: { status: 'matched', productId: '1', productName: null } })).toBe(true);
    expect(isAutoApprovable({ verification: verified, match: { status: 'conflict', productId: '1', productName: null } })).toBe(false);
    expect(isAutoApprovable({ verification: { ...verified, status: 'needs_review' }, match: { status: 'matched', productId: '1', productName: null } })).toBe(false);
  });
});
