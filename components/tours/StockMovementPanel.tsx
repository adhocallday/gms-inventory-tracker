'use client';

import { useMemo, useState } from 'react';

type StockMovementRow = {
  received_date: string | null;
  delivery_number: string | null;
  sku: string;
  size: string | null;
  quantity_received: number;
  vendor: string | null;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

function formatDate(value?: string | null) {
  if (!value) return 'TBD';
  return dateFormatter.format(new Date(value));
}

const INITIAL_COUNT = 10;

export function StockMovementPanel({ rows }: { rows: StockMovementRow[] }) {
  const [skuFilter, setSkuFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  const filteredRows = useMemo(() => {
    const needle = skuFilter.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !row.sku.toLowerCase().includes(needle)) return false;
      if (fromDate && row.received_date && row.received_date < fromDate) return false;
      if (toDate && row.received_date && row.received_date > toDate) return false;
      return true;
    });
  }, [rows, skuFilter, fromDate, toDate]);

  const visibleRows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount]
  );

  const canLoadMore = visibleCount < filteredRows.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(filteredRows.length, prev + INITIAL_COUNT));
  };

  return (
    <section className="g-card p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold g-title">Stock Movement</h2>
          <p className="text-sm text-[var(--g-text-muted)]">
            Chronological receipts by delivery.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="g-input w-36"
            placeholder="Filter SKU"
            value={skuFilter}
            onChange={(event) => setSkuFilter(event.target.value)}
          />
          <input
            className="g-input"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
          <input
            className="g-input"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="min-w-full text-sm g-table">
          <thead className="text-left border-b border-slate-200">
            <tr>
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Delivery</th>
              <th className="py-2 pr-4">SKU</th>
              <th className="py-2 pr-4">Size</th>
              <th className="py-2 pr-4 text-right">Received</th>
              <th className="py-2 pr-4">Vendor</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td className="py-3" colSpan={6}>
                  No receipts match the current filters.
                </td>
              </tr>
            ) : (
              visibleRows.map((row, index) => (
                <tr key={`${row.delivery_number ?? 'delivery'}-${index}`} className="border-b border-slate-200">
                  <td className="py-3 pr-4">{formatDate(row.received_date)}</td>
                  <td className="py-3 pr-4">{row.delivery_number ?? '—'}</td>
                  <td className="py-3 pr-4 font-semibold">{row.sku}</td>
                  <td className="py-3 pr-4">{row.size ?? '—'}</td>
                  <td className="py-3 pr-4 text-right">{row.quantity_received}</td>
                  <td className="py-3 pr-4">{row.vendor ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {canLoadMore && (
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={handleLoadMore}
              className="px-4 py-2 rounded-full border border-slate-300 text-sm hover:bg-slate-50 transition"
            >
              Load more ({filteredRows.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
