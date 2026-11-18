import type {
  DbCompRow,
  DbProductImageRow,
  DbSaleRow,
  DbShowSalesRow,
  DbTourProductRow,
  RawTourData,
} from '../from-db';

/**
 * A small, entirely made-up tour as the database holds it: show_sales_per_head
 * rows, tour_products with embedded products (one row per size), sales, comps
 * and product_images_detail rows.
 *
 * It carries the problems the real tours do: two pre-leg one-offs, one with an
 * implausible per head; two misspelled cities; a "CAPTIANS" product typo; a
 * high-price jersey that ranks far better by gross than by units; a long tail
 * under 1% of gross; a show with no attendance; an unposted future show; a
 * sales line with units but no gross; comps; sized SKUs; and photos that are
 * not all primary.
 */

const PRODUCTS: [sku: string, name: string, units: number, price: number, cost: number | null, sizes: string[]][] = [
  ['TSTARX203225BK', 'BLACK 2026 AMERICA ITIN TEE', 4000, 45, 8.5, ['MED', 'LG', 'XL']],
  ['TSTARX203227BK', 'BLACK SKELETON CREW TEE', 2500, 45, 8.5, ['MED', 'LG']],
  ['TSTARX203228BK', 'BLACK WARHEAD ITIN TEE', 2200, 45, 9, ['LG']],
  ['TSTARX203226BK', 'BLACK RATTLESNAKE ITIN TEE', 1800, 45, 9, ['MED', 'XL']],
  ['TSTARX203230BK', 'EYE OF THE STORM ZIP HOODIE', 900, 95, 22, ['LG']],
  ['TSTARX303217BK', 'LEGIONS CAPTIANS HAT', 700, 35, null, ['OS']],
  ['TSTARX103218BK', 'KNUCKLEHEAD BANDANA', 400, 15, 2, ['OS']],
  ['TSTARX103219OT', 'BLACK AND YELLOW BANDANA', 350, 15, 2, ['OS']],
  ['TSTANS503207OT', 'USA HOCKEY JERSEY', 300, 150, 40, ['LG', 'XL']],
  ['TSTARX003219BK', 'FORGIVE US FLAG', 60, 25, 5, ['OS']],
  ['TSTARX003240OT', 'ENAMEL PIN', 40, 10, 1, ['OS']],
  // On the tour but never sold: drops out of the report.
  ['TSTARX003241OT', 'UNSOLD KOOZIE', 0, 5, 1, ['OS']],
];

/** [date, city, attendance, sales weight]; weight 0 = no sales posted yet. */
const SHOWS: [date: string, city: string | null, venue: string, attendance: number | null, weight: number][] = [
  // Pre-leg one-offs. Daytona's attendance is the planted entry error.
  ['2026-03-14', 'DAYTONA', 'Speedway', 45_000, 0.3],
  ['2026-04-02', 'MESCALERO', 'Inn of the Mountain Gods', 2_500, 0.35],
  ['2026-07-08', 'HUNTSVILE', 'VBC Arena', 4_500, 0.7],
  ['2026-07-10', 'NASHVILLE', 'Bridgestone Arena', 5_100, 0.85],
  ['2026-07-12', 'VIRGINA BEACH', 'Amphitheater', 4_250, 0.6],
  ['2026-07-15', 'TORONTO', 'Budweiser Stage', 5_400, 0.9],
  // No head count entered.
  ['2026-08-02', 'CHICAGO', 'United Center', null, 1],
  ['2026-08-05', 'DETROIT', 'Pine Knob', 5_200, 0.8],
  ['2026-08-08', null, 'Centre Bell', 5_100, 0.75],
  ['2026-09-01', 'DENVER', 'Ball Arena', 5_500, 0.9],
  ['2026-09-04', 'PHOENIX', 'Talking Stick', 4_900, 0.65],
  ['2026-09-06', 'LOS ANGELES', 'Kia Forum', 6_150, 1.1],
  // Future date, nothing posted.
  ['2026-10-01', 'SEATTLE', 'Climate Pledge', 6_000, 0],
];

const weightTotal = SHOWS.reduce((sum, [, , , , w]) => sum + w, 0);

export const syntheticDb = (): RawTourData => {
  const tourProducts: DbTourProductRow[] = [];
  const sales: DbSaleRow[] = [];
  const comps: DbCompRow[] = [];
  const shows: DbShowSalesRow[] = [];

  PRODUCTS.forEach(([sku, name, , , cost, sizes], p) => {
    sizes.forEach((size, s) => {
      tourProducts.push({
        id: `tp-${p}-${s}`,
        size,
        // Costs sometimes arrive as strings.
        full_package_cost: cost === null ? null : s % 2 ? String(cost + 1) : cost,
        product: {
          id: `prod-${p}-${s}`,
          // Sized SKUs, as AtVenu-sourced products are stored.
          sku: sizes.length > 1 ? `${sku}_${size}` : sku,
          description: name,
          product_type: 'apparel',
        },
      });
    });
  });

  SHOWS.forEach(([date, city, venue, attendance, weight], i) => {
    const showId = `show-${String(i).padStart(2, '0')}`;
    let gross = 0;
    PRODUCTS.forEach(([, , units, price, , sizes], p) => {
      const showUnits = Math.round((units * weight) / weightTotal);
      sizes.forEach((_, s) => {
        const qty = s === sizes.length - 1 ? showUnits - Math.floor(showUnits / sizes.length) * s : Math.floor(showUnits / sizes.length);
        if (weight === 0) return;
        // One line posted with units but no gross.
        const lineGross = i === 7 && p === 1 && s === 0 ? 0 : qty * price;
        gross += qty * price;
        sales.push({
          show_id: showId,
          tour_product_id: `tp-${p}-${s}`,
          qty_sold: qty,
          gross_sales: p % 3 === 0 ? String(lineGross) : lineGross,
        });
      });
    });
    if (weight > 0 && i % 4 === 1) {
      comps.push({ show_id: showId, tour_product_id: 'tp-0-0', quantity: 12 });
    }
    // Show gross is the settlement figure; it need not equal the line sum.
    const showGross = Math.round(gross * 1.02);
    shows.push({
      show_id: showId,
      show_date: date,
      venue_name: venue,
      city,
      state: null,
      total_gross: weight === 0 ? 0 : String(showGross),
      attendance,
      per_head: attendance ? (showGross / attendance).toFixed(2) : null,
    });
  });

  const images: DbProductImageRow[] = [
    { sku: 'TSTARX203225BK_MED', product_description: 'BLACK 2026 AMERICA ITIN TEE', file_url: 'https://img.test/itin-alt.png', is_primary: false, display_order: 0 },
    { sku: 'TSTARX203225BK_LG', product_description: 'BLACK 2026 AMERICA ITIN TEE', file_url: 'https://img.test/itin.png', is_primary: true, display_order: 1 },
    { sku: 'TSTARX203230BK', product_description: 'Eye of the Storm Hoodie', file_url: 'https://img.test/hoodie.png', is_primary: true, display_order: 0 },
    { sku: 'TSTANS503207OT_XL', product_description: 'USA Hockey Jersey', file_url: 'https://img.test/jersey.png', is_primary: false, display_order: 2 },
    { sku: null, product_description: null, file_url: 'https://img.test/orphan.png', is_primary: true, display_order: 0 },
    { sku: 'TSTARX303217BK', product_description: 'Legions Hat', file_url: null, is_primary: true, display_order: 0 },
  ];

  // The database returns rows in id order; shuffle shows to prove sorting.
  return {
    tour: {
      id: '00000000-0000-4000-8000-000000000001',
      name: '2026 Synthetic Tour',
      artist: 'Synthetic Artist',
      start_date: '2026-03-14',
      end_date: '2026-10-01',
    },
    shows: [...shows.slice(6), ...shows.slice(0, 6)],
    tourProducts,
    sales,
    comps,
    images,
  };
};
