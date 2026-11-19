/**
 * Current projection values per SKU, computed the same way the projection
 * sheet (components/projections/ProjectionSheet.tsx, `rows`) computes them,
 * so the chat assistant quotes the numbers the user sees.
 *
 * Keep in step with ProjectionSheet. Note: the sheet's per-SKU share takes
 * the last size row's gross for each SKU (its `shareBySku` overwrites per
 * row); this mirrors that on purpose so the values match what is displayed.
 */

export const SIZE_ORDER = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

export const DEFAULT_SIZE_CURVE: Record<string, number> = {
  S: 0.12,
  M: 0.26,
  L: 0.28,
  XL: 0.2,
  '2XL': 0.09,
  '3XL': 0.05,
};

export interface CurrentValueInputs {
  products: { id: string; sku: string; description: string | null }[];
  tourProducts: { product_id: string; size: string | null; full_package_cost: number | null; suggested_retail: number | null }[];
  productSummary: { sku: string; size: string | null; total_sold: number | null; total_gross: number | null }[];
  overrides: { sku: string; size: string | null; bucket: string | null; override_units: number | null }[];
  expectedAttendance: number;
  expectedPerHead: number;
}

export interface CurrentSkuValues {
  sku: string;
  name: string;
  price: number;
  /** Forecast units for the SKU (total override, else baseline), rounded */
  units: number;
  /** Units per size (size override, else curve share of units) */
  sizes: Record<string, number>;
  /** True when the total comes from a saved override */
  overridden: boolean;
}

const num = (v: number | string | null | undefined) => (v ? Number(v) : 0);

export function computeCurrentValues(input: CurrentValueInputs): CurrentSkuValues[] {
  const skuById = new Map(input.products.map(p => [p.id, p.sku]));

  const overrideMap: Record<string, string> = {};
  input.overrides.forEach(row => {
    overrideMap[`${row.sku}::${row.size ?? ''}::${row.bucket ?? ''}`] = String(row.override_units ?? 0);
  });

  const sizeMap = new Map<string, string[]>();
  const retailMap = new Map<string, number>();
  input.tourProducts.forEach(row => {
    const sku = skuById.get(row.product_id);
    if (!sku) return;
    if (row.size) {
      const list = sizeMap.get(sku) ?? [];
      if (!list.includes(row.size)) list.push(row.size);
      sizeMap.set(sku, list);
    }
    if (row.suggested_retail !== null) {
      retailMap.set(`${sku}:${row.size ?? ''}`, Number(row.suggested_retail));
      if (!retailMap.has(`${sku}:`)) retailMap.set(`${sku}:`, Number(row.suggested_retail));
    }
  });
  sizeMap.forEach(list => list.sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)));

  const totalGross = input.productSummary.reduce((s, r) => s + num(r.total_gross), 0);
  const shareBySku = new Map<string, number>();
  input.productSummary.forEach(r => shareBySku.set(r.sku, num(r.total_gross) / (totalGross || 1)));

  const soldTotals = new Map<string, number>();
  input.productSummary.forEach(r => {
    if (r.size) soldTotals.set(r.sku, (soldTotals.get(r.sku) ?? 0) + num(r.total_sold));
  });
  const curveBySku = new Map<string, Record<string, number>>();
  input.productSummary.forEach(r => {
    if (!r.size) return;
    const total = soldTotals.get(r.sku) ?? 0;
    const curve = curveBySku.get(r.sku) ?? {};
    curve[r.size] = total ? num(r.total_sold) / total : 0;
    curveBySku.set(r.sku, curve);
  });

  const expectedGross = input.expectedAttendance * input.expectedPerHead;

  return input.products.map(product => {
    const sku = product.sku;
    const sizes = sizeMap.get(sku) ?? SIZE_ORDER;
    const priceOverride = overrideMap[`${sku}::PRICE::`];
    const price =
      Number(priceOverride ?? retailMap.get(`${sku}:`) ?? 0) || Number(retailMap.get(`${sku}:`) ?? 0);
    const baseline = price ? (expectedGross * (shareBySku.get(sku) ?? 0)) / price : 0;
    const totalOverride = overrideMap[`${sku}::::`];
    const forecastUnits = totalOverride ? Number(totalOverride) : baseline;
    const curve = curveBySku.get(sku) ?? DEFAULT_SIZE_CURVE;
    const sizeUnits: Record<string, number> = {};
    sizes.forEach(size => {
      const o = overrideMap[`${sku}::${size}::`];
      sizeUnits[size] = o !== undefined ? Number(o) : Math.round(forecastUnits * (curve[size] ?? 0));
    });
    return {
      sku,
      name: product.description ?? sku,
      price: Math.round(price * 100) / 100,
      units: Math.round(forecastUnits),
      sizes: sizeUnits,
      overridden: Boolean(totalOverride),
    };
  });
}

/** Current value for one override target: a size, or the SKU total when size is null. */
export function currentValueFor(values: CurrentSkuValues[], sku: string, size: string | null): number | undefined {
  const row = values.find(v => v.sku === sku);
  if (!row) return undefined;
  if (size === null) return row.units;
  return row.sizes[size];
}
