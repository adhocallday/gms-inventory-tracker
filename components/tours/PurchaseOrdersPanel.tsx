'use client';

import { useMemo, useState } from 'react';

interface PurchaseOrderRow {
  id: string;
  po_number: string;
  vendor: string;
  status: string;
  order_date: string | null;
  expected_delivery: string | null;
  total_amount: number | null;
}

interface OpenQtyRow {
  po_id: string;
  po_line_item_id: string;
  sku: string;
  description: string;
  size: string | null;
  quantity_ordered: number;
  quantity_received: number;
  open_quantity: number;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

function formatDate(value?: string | null) {
  if (!value) return 'TBD';
  return dateFormatter.format(new Date(value));
}

const INITIAL_COUNT = 5;

export function PurchaseOrdersPanel({
  purchaseOrders,
  openQuantities
}: {
  purchaseOrders: PurchaseOrderRow[];
  openQuantities: OpenQtyRow[];
}) {
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  const vendors = Array.from(
    new Set(purchaseOrders.map((po) => po.vendor).filter(Boolean))
  );

  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return purchaseOrders.filter((po) => {
      if (vendorFilter !== 'all' && po.vendor !== vendorFilter) return false;
      if (statusFilter !== 'all' && po.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        po.po_number.toLowerCase().includes(needle) ||
        po.vendor.toLowerCase().includes(needle)
      );
    });
  }, [purchaseOrders, search, vendorFilter, statusFilter]);

  const openByPo = useMemo(() => {
    const map = new Map<string, OpenQtyRow[]>();
    openQuantities.forEach((row) => {
      if (!map.has(row.po_id)) map.set(row.po_id, []);
      map.get(row.po_id)?.push(row);
    });
    return map;
  }, [openQuantities]);

  const visibleOrders = useMemo(
    () => filteredOrders.slice(0, visibleCount),
    [filteredOrders, visibleCount]
  );

  const canLoadMore = visibleCount < filteredOrders.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(filteredOrders.length, prev + INITIAL_COUNT));
  };

  return (
    <section className="g-card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold g-title">Purchase Orders</h2>
          <p className="text-sm text-[var(--g-text-muted)]">
            Track ordered vs received inventory by SKU.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="g-input w-44"
            placeholder="Search PO/Vendor"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="g-input w-40"
            value={vendorFilter}
            onChange={(event) => setVendorFilter(event.target.value)}
          >
            <option value="all">All vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
          <select
            className="g-input w-32"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All status</option>
            <option value="open">Open</option>
            <option value="received">Received</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-sm text-[var(--g-text-muted)]">
            No purchase orders match the current filters.
          </div>
        ) : (
          visibleOrders.map((po) => {
            const rows = openByPo.get(po.id) ?? [];
            const isOpen = expanded[po.id];
            return (
              <div
                key={po.id}
                className="border border-white/10 rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full text-left p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [po.id]: !prev[po.id]
                    }))
                  }
                >
                  <div>
                    <p className="text-sm font-semibold">{po.po_number}</p>
                    <p className="text-xs text-[var(--g-text-muted)]">
                      {po.vendor} · Ordered {formatDate(po.order_date)} · ETA{' '}
                      {formatDate(po.expected_delivery)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--g-text-muted)]">
                    <span className="uppercase tracking-wide">{po.status}</span>
                    <span>
                      {po.total_amount
                        ? moneyFormatter.format(po.total_amount)
                        : 'Total TBD'}
                    </span>
                    <span>{rows.length} SKUs</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-white/10 px-4 pb-4">
                    <table className="min-w-full text-sm g-table mt-3">
                      <thead>
                        <tr>
                          <th className="text-left py-2">SKU</th>
                          <th className="text-left py-2">Size</th>
                          <th className="text-right py-2">Ordered</th>
                          <th className="text-right py-2">Received</th>
                          <th className="text-right py-2">Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.po_line_item_id} className="border-t border-white/10">
                            <td className="py-2">
                              <div className="font-semibold">{row.sku}</div>
                              <div className="text-xs text-[var(--g-text-muted)]">
                                {row.description}
                              </div>
                            </td>
                            <td className="py-2">{row.size ?? '—'}</td>
                            <td className="py-2 text-right">{row.quantity_ordered}</td>
                            <td className="py-2 text-right">{row.quantity_received}</td>
                            <td className="py-2 text-right">{row.open_quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}

        {canLoadMore && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleLoadMore}
              className="px-4 py-2 rounded-full border border-white/30 text-sm hover:bg-white/5 transition"
            >
              Load more ({filteredOrders.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
