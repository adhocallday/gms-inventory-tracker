'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';

export interface TopSellerRow {
  product_id: string;
  size: string;
  total_sold: number;
  total_gross: number;
}

export interface ProductInfo {
  sku: string;
  description: string;
}

interface TopSellersPanelProps {
  tourId: string;
  topSellers: TopSellerRow[];
  productMap: Map<string, ProductInfo>;
}

const INITIAL_COUNT = 5;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const formatNumber = (value: number) => value.toLocaleString();

export default function TopSellersPanel({ tourId, topSellers, productMap }: TopSellersPanelProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const visibleSellers = useMemo(() => topSellers.slice(0, visibleCount), [topSellers, visibleCount]);
  const canLoadMore = visibleCount < topSellers.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(topSellers.length, prev + INITIAL_COUNT));
  };

  return (
    <section className="g-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Top sellers</h2>
        <Link
          href={`/upload?docType=sales-report&tourId=${tourId}`}
          className="text-sm font-medium g-link"
        >
          Upload document
        </Link>
      </div>
      <div className="mt-4 space-y-4">
        {visibleSellers.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            No sales posted yet. Upload a sales report to see top sellers.
          </p>
        ) : (
          <>
            {visibleSellers.map((row) => {
              const product = productMap.get(row.product_id);
              return (
                <Link
                  key={`${row.product_id}-${row.size}`}
                  href={`/products/${row.product_id}`}
                  className="block border border-[var(--color-bg-border)] rounded-md p-3 transition-colors hover:bg-[var(--color-bg-elevated)]"
                >
                  <p className="text-sm font-semibold">
                    {product?.sku ?? 'SKU'} · {row.size}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {product?.description ?? 'No description'}
                  </p>
                  <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)] mt-2 tabular-nums">
                    <span>{formatNumber(Number(row.total_sold ?? 0))} sold</span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {currencyFormatter.format(Number(row.total_gross ?? 0))}
                    </span>
                  </div>
                </Link>
              );
            })}

            {canLoadMore && (
              <button
                onClick={handleLoadMore}
                className="w-full py-2 rounded-md border border-[var(--color-bg-border)] text-sm font-medium transition-colors hover:bg-[var(--color-bg-elevated)]"
              >
                Load more ({topSellers.length - visibleCount} remaining)
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
