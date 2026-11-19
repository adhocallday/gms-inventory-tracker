import { describe, expect, it } from 'vitest';
import { compactTourData, projectionSystem } from './projection-prompt';
import type { ProjectionContext } from './projection-agent';

const ctx = (rows: any[]): ProjectionContext => ({
  tourId: 't',
  tourName: 'Tour',
  productSummary: rows,
  showSummary: [
    { show_date: '2025-07-10', city: 'B', attendance: 100, total_gross: 3000 },
    { show_date: '2025-07-09', city: 'A', attendance: 100, total_gross: 1000 },
  ],
  inventoryBalances: [{ product_id: 'p1', size: 'S', balance: 5 }],
  poOpenQuantities: [{ sku: 'A1', size: 'M', open_quantity: 7 }],
  expectedAttendance: 1000,
  expectedPerHead: 20,
});

const rows = [
  { product_id: 'p1', sku: 'A1', description: 'Tee', size: 'S', total_sold: 10, total_gross: 400, full_package_cost: 6 },
  { product_id: 'p1', sku: 'A1', description: 'Tee', size: 'M', total_sold: 30, total_gross: 1200, full_package_cost: 6 },
  { product_id: 'p2', sku: 'B2', description: 'Cap', size: null, total_sold: 5, total_gross: 150, full_package_cost: 3 },
];

describe('compactTourData', () => {
  it('aggregates size rows to one record per SKU', () => {
    const d = compactTourData(ctx(rows));
    expect(d.products[0]).toEqual({
      sku: 'A1', name: 'Tee', sold: 40, gross: 1600, avgPrice: 40, unitCost: 6, sizes: { M: 30, S: 10 }, onHand: 5, onOrder: 7,
    });
    expect(d.products[1].sizes).toEqual({ OS: 5 });
    expect(d.shows).toMatchObject({ count: 2, attendance: 200, gross: 4000, perHead: 20 });
    expect(d.shows.list[0][0]).toBe('2025-07-09');
  });

  it('is byte-identical regardless of row order (cache-stable)', () => {
    const a = projectionSystem(ctx(rows));
    const b = projectionSystem(ctx([...rows].reverse()));
    expect(a).toEqual(b);
    expect(a[1].cache_control).toEqual({ type: 'ephemeral' });
    expect(a[1].text).not.toContain('  ');
  });
});
