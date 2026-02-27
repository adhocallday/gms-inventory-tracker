'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { InventoryBalanceTable, type InventoryBalanceRow } from '@/components/inventory/InventoryBalanceTable';
import { StockMovementsTable, type StockMovementRow } from '@/components/inventory/StockMovementsTable';
import { Button } from '@/components/ui/Button';

interface Tour {
  id: string;
  name: string;
  artist: string;
}

interface InventoryData {
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

export default function InventoryTrackerPage() {
  const params = useParams();
  const tourId = params.id as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'balance' | 'movements'>('balance');

  // Filters
  const [searchSku, setSearchSku] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low' | 'out'>('all');
  const [productTypeFilter, setProductTypeFilter] = useState('all');

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch tour info
        const tourRes = await fetch(`/api/tours`);
        if (tourRes.ok) {
          const toursData = await tourRes.json();
          const currentTour = toursData.data?.find((t: Tour) => t.id === tourId);
          setTour(currentTour || null);
        }

        // Fetch inventory data
        const inventoryRes = await fetch(`/api/tours/${tourId}/inventory`);
        if (inventoryRes.ok) {
          const inventoryData = await inventoryRes.json();
          setData(inventoryData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tourId]);

  const filteredInventory = useMemo(() => {
    if (!data) return [];

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
    if (!data) return [];

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
    if (!data) return;

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

  if (loading) {
    return (
      <div className="g-container py-12">
        <div className="text-center text-[var(--color-text-secondary)]">
          Loading inventory data...
        </div>
      </div>
    );
  }

  if (!tour || !data) {
    return (
      <div className="g-container py-12">
        <div className="text-center text-[var(--color-text-muted)]">
          No data available
        </div>
      </div>
    );
  }

  const productTypes = Array.from(
    new Set(data.inventory.map((i) => i.product_type))
  );

  return (
    <div className="g-container py-12">
      {/* Header */}
      <Link href={`/tours/${tourId}`} className="text-sm font-medium g-link">
        ← Back to tour
      </Link>

      <div className="flex flex-col gap-4 mt-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="g-kicker">Inventory Tracker</p>
          <h1 className="text-3xl font-semibold g-title mt-2">{tour.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{tour.artist}</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-8">
        <div className="g-card p-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Products</p>
          <p className="text-2xl font-semibold">{data.summary.total_products}</p>
        </div>

        <div className="g-card p-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">On Hand</p>
          <p className="text-2xl font-semibold text-green-300">
            {formatNumber(data.summary.total_on_hand)}
          </p>
        </div>

        <div className="g-card p-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">On Order</p>
          <p className="text-2xl font-semibold text-blue-300">
            {formatNumber(data.summary.total_on_order)}
          </p>
        </div>

        <div className="g-card p-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Total Sold</p>
          <p className="text-2xl font-semibold">{formatNumber(data.summary.total_sold)}</p>
        </div>

        <div className="g-card p-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Inventory Value</p>
          <p className="text-2xl font-semibold">
            {formatCurrency(data.summary.total_value)}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {(data.summary.low_stock_items > 0 || data.summary.out_of_stock_items > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {data.summary.low_stock_items > 0 && (
            <div className="g-card p-4 border-yellow-500/30">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-yellow-300">
                    {data.summary.low_stock_items} Low Stock Items
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Less than 10 units remaining
                  </p>
                </div>
              </div>
            </div>
          )}

          {data.summary.out_of_stock_items > 0 && (
            <div className="g-card p-4 border-red-500/30">
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xl">🚫</span>
                <div>
                  <p className="text-sm font-semibold text-red-300">
                    {data.summary.out_of_stock_items} Out of Stock
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    No units available
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="g-card p-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="g-label block mb-1">Search SKU</label>
            <input
              type="text"
              className="g-input"
              placeholder="Search by SKU..."
              value={searchSku}
              onChange={(e) => setSearchSku(e.target.value)}
            />
          </div>

          <div>
            <label className="g-label block mb-1">Stock Level</label>
            <select
              className="g-input"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
            >
              <option value="all">All Items</option>
              <option value="in-stock">In Stock</option>
              <option value="low">Low Stock (&lt; 10)</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>

          <div>
            <label className="g-label block mb-1">Product Type</label>
            <select
              className="g-input"
              value={productTypeFilter}
              onChange={(e) => setProductTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {productTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="g-label block mb-1">View</label>
            <div className="flex gap-2">
              <button
                className={`g-button ${
                  view === 'balance' ? '' : 'g-button-outline'
                } text-sm flex-1`}
                onClick={() => setView('balance')}
              >
                Balance
              </button>
              <button
                className={`g-button ${
                  view === 'movements' ? '' : 'g-button-outline'
                } text-sm flex-1`}
                onClick={() => setView('movements')}
              >
                Movements
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Balance Table */}
      {view === 'balance' && (
        <div className="g-card p-6 mt-6">
          <h3 className="text-lg font-semibold g-title mb-4">
            Inventory Balance ({filteredInventory.length} items)
          </h3>
          <InventoryBalanceTable data={filteredInventory} />
        </div>
      )}

      {/* Stock Movements Table */}
      {view === 'movements' && (
        <div className="g-card p-6 mt-6">
          <h3 className="text-lg font-semibold g-title mb-4">
            Stock Movements ({filteredMovements.length} records)
          </h3>
          <StockMovementsTable data={filteredMovements} />
        </div>
      )}
    </div>
  );
}
