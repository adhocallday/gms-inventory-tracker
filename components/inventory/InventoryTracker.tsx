'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { InventoryBalanceTable, type InventoryBalanceRow } from '@/components/inventory/InventoryBalanceTable';
import { StockMovementsTable, type StockMovementRow } from '@/components/inventory/StockMovementsTable';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, ArrowLeft, Ban } from 'lucide-react';

export interface Tour {
  id: string;
  name: string;
  artist: string;
}

export interface InventoryData {
  summary: {
    total_products: number;
    total_on_hand: number;
    total_on_order: number;
    total_sold: number;
    total_value: number;
    low_stock_items: number;
    out_of_stock_items: number;
  };
  inventory: InventoryBalanceRow[];
  movements: StockMovementRow[];
  openPOs: any[];
}

export function InventoryTracker({ tour, data }: { tour: Tour; data: InventoryData }) {
  const tourId = tour.id;
  const [view, setView] = useState<'balance' | 'movements'>('balance');

  // Filters
  const [searchSku, setSearchSku] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low' | 'out'>('all');
  const [productTypeFilter, setProductTypeFilter] = useState('all');

  const filteredInventory = useMemo(() => {
    return data.inventory.filter((item) => {
      // Search filter
      if (searchSku && !item.sku.toLowerCase().includes(searchSku.toLowerCase())) {
        return false;
      }

      // Stock level filter
      if (stockFilter === 'in-stock' && item.balance <= 0) return false;
      if (stockFilter === 'low' && (item.balance === 0 || item.balance >= 10)) return false;
      if (stockFilter === 'out' && item.balance !== 0) return false;

      // Product type filter
      if (productTypeFilter !== 'all' && item.product_type !== productTypeFilter) {
        return false;
      }

      return true;
    });
  }, [data, searchSku, stockFilter, productTypeFilter]);

  const filteredMovements = useMemo(() => {
    return data.movements.filter((movement) => {
      if (searchSku && !movement.sku.toLowerCase().includes(searchSku.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [data, searchSku]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const exportCsv = () => {
    const headers = [
      'SKU',
      'Description',
      'Size',
      'Type',
      'Received',
      'Sold',
      'Comps',
      'Balance',
      'Unit Cost',
      'Retail Price',
      'Inventory Value',
    ];

    const rows = filteredInventory.map((item) => [
      item.sku,
      `"${item.description.replace(/"/g, '""')}"`,
      item.size,
      item.product_type,
      item.total_received,
      item.total_sold,
      item.total_comps,
      item.balance,
      item.full_package_cost.toFixed(2),
      item.suggested_retail.toFixed(2),
      (item.balance * item.full_package_cost).toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-${tourId}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Sizes with sales but no receipts recorded have a negative balance. They
  // are counted in the totals as computed; the alert below names them.
  const noReceiptLines = data.inventory.filter((i) => i.balance < 0 && !i.total_received).length;

  const productTypes = Array.from(
    new Set(data.inventory.map((i) => i.product_type))
  );

  return (
    <div className="g-container py-6">
      <Link href={`/tours/${tourId}`} className="text-sm font-medium g-link">
        <ArrowLeft className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />
        {tour.name}
      </Link>

      <div className="flex flex-col gap-4 mt-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px] lg:leading-9">Inventory</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {tour.artist}. Balance = received − sold − comps, refreshed after each posted document.
          </p>
        </div>
        <Button variant="secondary" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div data-tour="inv-summary" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
        {[
          { label: 'Product lines', value: formatNumber(data.summary.total_products) },
          { label: 'On hand', value: formatNumber(data.summary.total_on_hand) },
          { label: 'On order', value: formatNumber(data.summary.total_on_order) },
          { label: 'Sold', value: formatNumber(data.summary.total_sold) },
          { label: 'Inventory value', value: formatCurrency(data.summary.total_value) },
        ].map((card) => (
          <div key={card.label} className="g-card p-4">
            <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(data.summary.low_stock_items > 0 || data.summary.out_of_stock_items > 0 || noReceiptLines > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {data.summary.out_of_stock_items > 0 && (
            <button
              type="button"
              onClick={() => setStockFilter('out')}
              className="text-left rounded-lg border p-4 bg-danger-bg border-danger-border hover:border-danger"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-danger">
                <Ban className="h-4 w-4 shrink-0" aria-hidden="true" />
                {data.summary.out_of_stock_items} out of stock
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">Balance is zero. Show only these.</p>
            </button>
          )}
          {data.summary.low_stock_items > 0 && (
            <button
              type="button"
              onClick={() => setStockFilter('low')}
              className="text-left rounded-lg border p-4 bg-warn-bg border-warn-border hover:border-warn"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-warn">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {data.summary.low_stock_items} low stock
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">Fewer than 10 left. Show only these.</p>
            </button>
          )}
          {noReceiptLines > 0 && (
            <div className="rounded-lg border p-4 bg-[var(--color-bg-surface)] border-[var(--color-bg-border)]">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {noReceiptLines} sizes with no received stock recorded
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                Sold but never received on a posted packing list, so their balance is negative.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div data-tour="inv-controls" className="g-card p-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="inv-search" className="g-label block mb-1">SKU</label>
            <input
              id="inv-search"
              type="search"
              className="g-input w-full"
              placeholder="Search by SKU"
              value={searchSku}
              onChange={(e) => setSearchSku(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="inv-stock" className="g-label block mb-1">Stock level</label>
            <select
              id="inv-stock"
              className="g-input w-full"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="in-stock">In stock</option>
              <option value="low">Low stock (under 10)</option>
              <option value="out">Out of stock</option>
            </select>
          </div>

          <div>
            <label htmlFor="inv-type" className="g-label block mb-1">Product type</label>
            <select
              id="inv-type"
              className="g-input w-full"
              value={productTypeFilter}
              onChange={(e) => setProductTypeFilter(e.target.value)}
            >
              <option value="all">All types</option>
              {productTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="g-label block mb-1" id="inv-view">View</p>
            <div className="flex rounded-md border border-[var(--color-bg-border)] p-0.5 bg-[var(--color-bg-elevated)]" role="group" aria-labelledby="inv-view">
              {(['balance', 'movements'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    view === v
                      ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {v === 'balance' ? 'Balance' : 'Received stock'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Balance Table */}
      {view === 'balance' && (
        <div data-tour="inv-balance" className="mt-6">
          <h2 className="text-lg font-semibold mb-3">
            Balance <span className="font-normal text-[var(--color-text-secondary)] tabular-nums">· {filteredInventory.length} lines</span>
          </h2>
          <InventoryBalanceTable data={filteredInventory} />
        </div>
      )}

      {/* Stock Movements Table */}
      {view === 'movements' && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">
            Received stock <span className="font-normal text-[var(--color-text-secondary)] tabular-nums">· {filteredMovements.length} receipts</span>
          </h2>
          <StockMovementsTable data={filteredMovements} />
        </div>
      )}
    </div>
  );
}
