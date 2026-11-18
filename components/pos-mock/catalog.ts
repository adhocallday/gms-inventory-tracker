/**
 * Catalog shape for the POS mock, and the pure builder used by the read-only
 * route (app/api/pos-mock/catalog/route.ts). Only safe display fields leave
 * the server: name, sku, size, price and an image URL.
 */

export interface CatalogSize {
  size: string;
  priceCents: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  sizes: CatalogSize[];
  /** True when the price is a placeholder ($40 / $45) because the tracker has none. */
  samplePrice: boolean;
  imageUrl: string | null;
}

export interface Catalog {
  source: 'tracker' | 'sample';
  tourName: string;
  showName: string;
  items: CatalogItem[];
}

/** Rows as selected from tour_products joined to products. */
export interface TourProductRow {
  product_id: string;
  size: string;
  suggested_retail: number | string | null;
  is_active: boolean | null;
  products: { sku: string | null; description: string | null; product_type: string | null } | null;
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', '4XL', '5XL', 'OS'];

function sizeRank(size: string): number {
  const i = SIZE_ORDER.indexOf(size.toUpperCase());
  return i === -1 ? SIZE_ORDER.length : i;
}

const LOWER_PRICED = /tee|t-shirt|shirt|tank|crop|raglan|short/i;

/**
 * Placeholder price when the tracker has no suggested retail: $40 for tees,
 * tanks and shorts, $45 for everything else. Marked as sample in the UI.
 */
export function placeholderPriceCents(name: string, category: string): number {
  return LOWER_PRICED.test(`${name} ${category}`) ? 4000 : 4500;
}

/** "SKELETOUR ITIN TEE" → "Skeletour Itin Tee"; leaves mixed-case names alone. */
export function displayName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .replace(/(^|[\s(/#-])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase())
    .replace(/\b(Lp|Cd|Po|Os|Nyc|Wht|Blk|Mag)\b/g, (m) => m.toUpperCase());
}

export function buildCatalogItems(rows: readonly TourProductRow[], imageUrlFor: (productId: string) => string | null): CatalogItem[] {
  const byProduct = new Map<string, CatalogItem & { _anyPlaceholder: boolean }>();
  for (const row of rows) {
    if (row.is_active === false || !row.product_id || !row.size) continue;
    const rawName = row.products?.description?.trim() || row.products?.sku || 'Item';
    const category = row.products?.product_type ?? '';
    let item = byProduct.get(row.product_id);
    if (!item) {
      item = {
        id: row.product_id,
        name: displayName(rawName),
        sku: row.products?.sku ?? '',
        category,
        sizes: [],
        samplePrice: false,
        imageUrl: imageUrlFor(row.product_id),
        _anyPlaceholder: false,
      };
      byProduct.set(row.product_id, item);
    }
    const retail = row.suggested_retail == null ? NaN : Number(row.suggested_retail);
    const hasRetail = Number.isFinite(retail) && retail > 0;
    if (!hasRetail) item._anyPlaceholder = true;
    if (item.sizes.some((s) => s.size === row.size)) continue;
    item.sizes.push({
      size: row.size,
      priceCents: hasRetail ? Math.round(retail * 100) : placeholderPriceCents(rawName, category),
    });
  }
  return Array.from(byProduct.values()).map(({ _anyPlaceholder, ...item }) => ({
    ...item,
    samplePrice: _anyPlaceholder,
    sizes: [...item.sizes].sort((a, b) => sizeRank(a.size) - sizeRank(b.size)),
  }));
}

/** Seeded opening count per size, so settlement has something to count against. */
export function seededOpeningCount(size: string): number {
  const table: Record<string, number> = { XS: 12, S: 24, M: 48, L: 48, XL: 36, '2XL': 24, XXL: 24, '3XL': 12, OS: 30 };
  return table[size.toUpperCase()] ?? 20;
}

export function lineKey(itemId: string, size: string): string {
  return `${itemId}::${size}`;
}

/** Used when the route can't reach the database. Mirrors the iOS atvenu-sample.csv. */
export const SAMPLE_CATALOG: Catalog = {
  source: 'sample',
  tourName: 'Skeletour North America 2025',
  showName: 'Sample show',
  items: [
    { id: 'sample-itin', name: 'Skeletour Itin Tee', sku: 'GHO-ITIN-BK', category: 'Apparel', sizes: ['S', 'M', 'L', 'XL', '3XL'].map((size) => ({ size, priceCents: size === '3XL' ? 5000 : 4500 })), samplePrice: true, imageUrl: null },
    { id: 'sample-batw', name: 'Batwing Hoodie', sku: 'GHO-BATW-BK', category: 'Apparel', sizes: ['M', 'L', 'XL'].map((size) => ({ size, priceCents: 8000 })), samplePrice: true, imageUrl: null },
    { id: 'sample-tank', name: 'Opus Tank Top', sku: 'GHO-OPUS-BK', category: 'Apparel', sizes: ['S', 'M', 'L', 'XL'].map((size) => ({ size, priceCents: 4000 })), samplePrice: true, imageUrl: null },
    { id: 'sample-hat', name: 'Hat', sku: 'GHO-HAT', category: 'Hat', sizes: [{ size: 'OS', priceCents: 4500 }], samplePrice: true, imageUrl: null },
    { id: 'sample-lp', name: 'Skeleta LP', sku: 'GHO-LP', category: 'Vinyl', sizes: [{ size: 'OS', priceCents: 4500 }], samplePrice: true, imageUrl: null },
    { id: 'sample-prog', name: 'Skeletour Tour Program', sku: 'GHO-PROG', category: 'Book', sizes: [{ size: 'OS', priceCents: 4500 }], samplePrice: true, imageUrl: null },
  ],
};
