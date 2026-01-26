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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold g-title">Products</h2>
        <div className="flex gap-3 text-xs uppercase tracking-[0.3em] text-[var(--g-text-muted)]">
          <Link
            href={`/tours/${tourId}/inventory`}
            className="g-link px-3 py-1 border border-slate-300 rounded-full hover:border-slate-400"
          >
            Inventory
          </Link>
          <Link
            href={`/tours/${tourId}/cogs`}
            className="g-link px-3 py-1 border border-slate-300 rounded-full hover:border-slate-400"
          >
            COGS
          </Link>
        </div>
      </div>

      <div className="g-card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleProducts.map((product) => (
            <Link
              key={`${product.product_id}:${product.size ?? 'os'}`}
              href={`/products/${product.product_id}`}
              className="block space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-200 hover:border-[var(--g-accent-2)] transition"
            >
              <div className="text-xs text-[var(--g-text-muted)]">{product.size ?? 'One-Size'}</div>
              <div className="font-mono text-sm text-[var(--g-accent)]">{product.sku}</div>
              <p className="text-sm text-[var(--g-text)]">{product.description}</p>
              <div className="flex justify-between text-xs text-[var(--g-text-muted)]">
                <span>Sold: {product.total_sold?.toLocaleString()}</span>
                <span>
                  Value: {product.unit_value ? `$${product.unit_value.toFixed(2)}` : '--'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--g-text)]">
                  Margin: {product.gross_margin ? `${product.gross_margin.toFixed(0)}%` : '--'}
                </span>
                <span className="text-xs text-[var(--g-text-muted)]">
                  Balance: {product.balance?.toLocaleString() ?? '0'}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {canLoadMore && (
          <div className="flex justify-center mt-6">
            <button
              className="px-4 py-2 rounded-full border border-slate-300 text-sm hover:border-slate-400 hover:bg-slate-50 transition"
              onClick={handleLoadMore}
            >
              Load more products
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
