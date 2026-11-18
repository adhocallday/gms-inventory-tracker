'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export interface ProductCardData {
  product_id: string;
  sku: string;
  size: string | null;
  description: string;
  total_sold: number;
  total_gross: number;
  gross_margin: number | null;
  full_package_cost: number | null;
  balance: number | null;
  unit_value: number | null;
}

type ProductGridProps = {
  tourId: string;
  products: ProductCardData[];
};

const INITIAL_COUNT = 6;

export default function ProductGrid({ tourId, products }: ProductGridProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const visibleProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);
  const canLoadMore = visibleCount < products.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(products.length, prev + INITIAL_COUNT));
  };

  return (
    <section className="mt-10 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Products</h2>
        <div className="flex gap-2 text-sm">
          <Link href={`/tours/${tourId}/inventory`} className="g-link rounded-md px-2 py-1 hover:bg-[var(--color-bg-elevated)]">
            Inventory
          </Link>
          <Link href={`/tours/${tourId}/cogs`} className="g-link rounded-md px-2 py-1 hover:bg-[var(--color-bg-elevated)]">
            COGS
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleProducts.map((product) => {
          const margin = marginPercent(product);
          const noStock = product.balance !== null && product.balance < 0;
          return (
            <Link
              key={`${product.product_id}:${product.size ?? 'os'}`}
              href={`/products/${product.product_id}`}
              className="block rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] p-4 transition-colors hover:border-[var(--color-text-muted)]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-sm text-[var(--color-text-primary)]">{product.sku}</span>
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">{product.size ?? 'One size'}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-primary)] line-clamp-2">{product.description}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-[var(--color-text-secondary)]">Sold</dt>
                  <dd className="mt-0.5 text-sm font-medium tabular-nums">{product.total_sold.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-secondary)]">Margin</dt>
                  <dd className="mt-0.5 text-sm font-medium tabular-nums" title={margin === null ? 'No unit cost recorded' : undefined}>
                    {margin === null ? '—' : `${margin.toFixed(0)}%`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-secondary)]">On hand</dt>
                  <dd className="mt-0.5 text-sm font-medium tabular-nums">
                    {product.balance === null ? '—' : product.balance.toLocaleString()}
                  </dd>
                </div>
              </dl>
              {noStock && (
                <p className="mt-2 text-xs text-[var(--color-text-secondary)]">No received stock recorded for this size</p>
              )}
            </Link>
          );
        })}
      </div>

      {canLoadMore && (
        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-md border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-bg-elevated)]"
            onClick={handleLoadMore}
          >
            Show more products ({products.length - visibleCount} more)
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * gross_margin from product_summary_view is a dollar amount
 * (gross - units sold x full package cost), not a percentage. Margin % is
 * that over gross, and only meaningful when a unit cost (above zero) is recorded.
 */
function marginPercent(product: ProductCardData): number | null {
  // A cost of 0 means no cost was entered, not a free product.
  if (!product.full_package_cost || product.full_package_cost <= 0 || product.gross_margin === null) return null;
  if (!product.total_gross) return null;
  return (Number(product.gross_margin) / Number(product.total_gross)) * 100;
}
