import { describe, it, expect } from 'vitest';
import { mapTourData, categoryFromDb, type RawTourData } from './from-db';

const tp = (
  id: string,
  sku: string,
  description: string,
  size: string,
  cost: number | string | null,
  category: string | null = null,
) => ({
  id,
  size,
  full_package_cost: cost,
  product: {
    id: `p-${sku}`,
    sku,
    description,
    product_type: 'apparel',
    category: category ? { name: category } : null,
  },
});

const raw: RawTourData = {
  tour: {
    id: 't1',
    name: 'Mock Tour',
    artist: 'Mock Artist',
    start_date: '2026-07-01',
    end_date: '2026-07-31',
  },
  shows: [
    // Deliberately out of order; numeric columns arrive as strings sometimes.
    { show_id: 's2', show_date: '2026-07-03', venue_name: 'Arena B', city: 'DENVER', state: 'CO', total_gross: '3000', attendance: 100, per_head: '30.00' },
    { show_id: 's1', show_date: '2026-07-01', venue_name: 'Arena A', city: null, state: null, total_gross: 1500, attendance: null, per_head: null },
    { show_id: 's3', show_date: '2026-07-20', venue_name: 'Arena C', city: 'BOISE', state: 'ID', total_gross: null, attendance: 500, per_head: null },
  ],
  tourProducts: [
    tp('tp1', 'MOCKRX203225BK', 'BLACK MOCK ITIN TEE', 'MED', 8),
    tp('tp2', 'MOCKRX203225BK', 'BLACK MOCK ITIN TEE', 'LG', '10.00'),
    tp('tp3', 'MOCKRX303217BK', 'MOCK DAD CAP', 'OS', null, 'Headwear'),
    tp('tp4', 'MOCKRX103218BK', 'MOCK POSTER', 'OS', 2, 'Apparel'),
    { id: 'tp5', size: 'OS', full_package_cost: 1, product: null },
  ],
  sales: [
    { show_id: 's1', tour_product_id: 'tp1', qty_sold: 10, gross_sales: 400 },
    { show_id: 's1', tour_product_id: 'tp2', qty_sold: 20, gross_sales: '800' },
    { show_id: 's1', tour_product_id: 'tp3', qty_sold: 10, gross_sales: 300 },
    { show_id: 's2', tour_product_id: 'tp2', qty_sold: 50, gross_sales: 2000 },
    { show_id: 's2', tour_product_id: 'tp3', qty_sold: 20, gross_sales: 600 },
    { show_id: 's2', tour_product_id: 'tp4', qty_sold: 20, gross_sales: 400 },
    // Zero line on the unreported show does not make it reported.
    { show_id: 's3', tour_product_id: 'tp4', qty_sold: 0, gross_sales: 0 },
    // Units with no gross recorded.
    { show_id: 's2', tour_product_id: 'tp1', qty_sold: 5, gross_sales: 0 },
    // Orphan sale with no product is ignored.
    { show_id: 's2', tour_product_id: 'tp-missing', qty_sold: 99, gross_sales: 999 },
  ],
  comps: [
    { show_id: 's1', tour_product_id: 'tp1', quantity: 3 },
    { show_id: 's2', tour_product_id: 'tp2', quantity: 2 },
  ],
  images: [
    { sku: 'MOCKRX303217BK', product_description: 'Mock Dad Cap', file_url: 'https://img/cap.png' },
    { sku: 'MOCKRX303217BK', product_description: 'dupe', file_url: 'https://img/cap-2.png' },
    { sku: null, product_description: null, file_url: 'https://img/none.png' },
  ],
};

describe('mapTourData', () => {
  const result = mapTourData(raw);
  const { tracker } = result;

  it('rolls sizes up to one product per SKU with units, gross and share', () => {
    expect(tracker.products.map((p) => p.sku)).toEqual([
      'MOCKRX203225BK',
      'MOCKRX303217BK',
      'MOCKRX103218BK',
    ]);
    const tee = tracker.products[0];
    expect(tee.name).toBe('BLACK MOCK ITIN TEE');
    expect(tee.unitsSold).toBe(85);
    expect(tee.grossUsd).toBe(3200);
    expect(tee.shareOfGross).toBeCloseTo(3200 / 4500, 10);
    expect(tracker.products.reduce((s, p) => s + p.shareOfGross, 0)).toBeCloseTo(1, 10);
  });

  it('weights unit cost by units sold across sizes', () => {
    // 15 @ $8 + 70 @ $10
    expect(tracker.products[0].unitCost).toBeCloseTo((15 * 8 + 70 * 10) / 85, 10);
    expect(tracker.products[1].unitCost).toBeUndefined();
    expect(tracker.products[2].unitCost).toBe(2);
  });

  it('uses the DB category when it maps, else infers from the name', () => {
    expect(tracker.products[0].category).toBe('Tees');
    expect(tracker.products[1].category).toBe('Headwear');
    // "Apparel" is too generic; "MOCK POSTER" falls back to the SKU class (1xx) -> Accessories.
    expect(tracker.products[2].category).toBe('Accessories');
  });

  it('sums comps per product and for the tour', () => {
    expect(tracker.products[0].compUnits).toBe(5);
    expect(tracker.products[1].compUnits).toBeUndefined();
    expect(result.totalComps).toBe(5);
  });

  it('maps shows in date order and drops shows with no sales', () => {
    expect(tracker.shows).toEqual([
      { date: '2026-07-01', city: 'Arena A', grossUsd: 1500, attendance: undefined, perHeadUsd: undefined },
      { date: '2026-07-03', city: 'DENVER', grossUsd: 3000, attendance: 100, perHeadUsd: 30 },
    ]);
    expect(tracker.attendance).toBe(100);
    expect(tracker.artist).toBe('Mock Artist');
    expect(tracker.tourDates).toBe('Jul 1, 2026 – Jul 31, 2026');
  });

  it('counts units only at shows with attendance for ratios', () => {
    // s3 has attendance but no sales; s2 is the only counted show with sales.
    expect(result.unitsAtCountedShows).toEqual({
      MOCKRX203225BK: 55,
      MOCKRX303217BK: 20,
      MOCKRX103218BK: 20,
    });
  });

  it('keeps one photo per SKU', () => {
    expect(result.photos).toEqual([
      { sku: 'MOCKRX303217BK', itemName: 'Mock Dad Cap', imageKey: 'https://img/cap.png' },
    ]);
  });

  it('reports the data gaps', () => {
    expect(result.gaps.map((g) => g.field)).toEqual(['sales', 'gross', 'attendance', 'category', 'cost']);
    expect(result.gaps[0].message).toContain('1 show has no sales posted');
    expect(result.gaps[1].message).toContain('1 of 7 sales lines with units have no gross_sales');
    expect(result.gaps[2].message).toContain('1 of 2 reported shows');
    expect(result.gaps[3].message).toContain('2 products have');
    expect(result.gaps[4].message).toContain('1 selling product has');
  });

  it('accepts embeds typed as arrays', () => {
    const arrayShaped = mapTourData({
      ...raw,
      tourProducts: raw.tourProducts.map((row) => {
        const product = Array.isArray(row.product) ? row.product[0] : row.product;
        return {
          ...row,
          product: product
            ? [{ ...product, category: Array.isArray(product.category) || !product.category ? product.category : [product.category] }]
            : null,
        };
      }),
    });
    expect(arrayShaped.tracker).toEqual(tracker);
  });

  it('copes with an empty tour', () => {
    const empty = mapTourData({ ...raw, shows: [], tourProducts: [], sales: [], comps: [], images: [] });
    expect(empty.tracker.products).toEqual([]);
    expect(empty.tracker.shows).toEqual([]);
    expect(empty.tracker.attendance).toBe(0);
    expect(empty.gaps).toEqual([]);
  });
});

describe('categoryFromDb', () => {
  it('maps recognisable names and leaves generic ones alone', () => {
    expect(categoryFromDb('Hoodies')).toBe('Hoodies & jerseys');
    expect(categoryFromDb('Event Tees')).toBe('Tees');
    expect(categoryFromDb('Accessories')).toBe('Accessories');
    expect(categoryFromDb('Apparel')).toBeUndefined();
    expect(categoryFromDb(null)).toBeUndefined();
  });
});
