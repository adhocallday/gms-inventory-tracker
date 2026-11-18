import { describe, expect, it } from 'vitest';
import { toTrackerData } from './from-tracker-link';

describe('toTrackerData', () => {
  it('keeps the fields Charts uses and drops tracker-only ones', () => {
    const data = toTrackerData({
      artist: 'Ghost',
      tourDates: 'Jul 1, 2025 – Oct 1, 2025',
      attendance: 1200,
      products: [
        {
          sku: 'GH-001',
          name: 'Skeletour Tee Black',
          category: 'Tees',
          unitsSold: 40,
          shareOfGross: 0.25,
          grossUsd: 1600,
          compUnits: 2,
          unitCost: 6.5,
        },
        { sku: '', name: 'no sku', unitsSold: 1, shareOfGross: 0 },
      ],
      shows: [{ date: '2025-07-01', city: 'Austin', grossUsd: 6400, perHeadUsd: 12.5, attendance: 512 }],
    });

    expect(data).toEqual({
      artist: 'Ghost',
      tourDates: 'Jul 1, 2025 – Oct 1, 2025',
      attendance: 1200,
      products: [
        {
          sku: 'GH-001',
          name: 'Skeletour Tee Black',
          displayName: undefined,
          category: 'Tees',
          unitsSold: 40,
          shareOfGross: 0.25,
          supplier: undefined,
          unitCost: 6.5,
          closingStock: undefined,
        },
      ],
      shows: [
        {
          date: '2025-07-01',
          city: 'Austin',
          grossUsd: 6400,
          grossSecondCurrency: undefined,
          perHeadUsd: 12.5,
        },
      ],
    });
  });

  it('drops an unknown category and rejects a malformed payload', () => {
    const data = toTrackerData({
      artist: 'A',
      tourDates: '',
      attendance: 'n/a',
      products: [{ sku: 'X', name: 'X', category: 'Apparel', unitsSold: 1, shareOfGross: 1 }],
      shows: [],
    });
    expect(data?.products[0].category).toBeUndefined();
    expect(data?.attendance).toBe(0);
    expect(toTrackerData(null)).toBeNull();
    expect(toTrackerData({ products: 'x', shows: [] })).toBeNull();
  });
});
