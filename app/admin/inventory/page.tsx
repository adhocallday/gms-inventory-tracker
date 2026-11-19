'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Package, AlertTriangle, TrendingDown, Filter } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { StatCard, STAT_GRID } from '@/components/dashboard/StatCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { Badge } from '@/components/ui/Badge';
import { DataTable, NumericCell } from '@/components/ui/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { readJsonResponse } from '@/lib/http/read-json';
import { useFuzzySearch } from '@/hooks/useFuzzySearch';

interface InventoryItem {
  tour_id: string;
  tour_name: string;
  artist: string;
  product_id: string;
  sku: string;
  description: string;
  size: string;
  product_type: string;
  total_received: number;
  total_sold: number;
  total_comps: number;
  balance: number;
  full_package_cost: number;
}

interface Tour {
  id: string;
  name: string;
  artist: string;
  status: string;
}

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tourFilter, setTourFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const breadcrumbs = generateBreadcrumbs([
    { label: 'Admin', href: '/admin' },
    { label: 'Inventory' },
  ]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        const response = await fetch('/api/admin/inventory');
        const result = await readJsonResponse<{ tours: Tour[]; inventory: InventoryItem[] }>(response);
        setTours(result.tours);
        setInventory(result.inventory);
      } catch (err) {
        console.error('Failed to load inventory:', err);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  // Apply fuzzy search
  const searchedInventory = useFuzzySearch(inventory, searchQuery, {
    keys: ['sku', 'description', 'tour_name', 'artist', 'size'],
    threshold: 0.3,
  });

  // Apply filters
  const filteredInventory = useMemo(() => {
    let result = searchedInventory;

    if (tourFilter !== 'all') {
      result = result.filter((item) => item.tour_id === tourFilter);
    }

    if (stockFilter === 'low') {
      result = result.filter((item) => item.balance > 0 && item.balance < 10);
    } else if (stockFilter === 'out') {
      result = result.filter((item) => item.balance === 0);
    }

    return result;
  }, [searchedInventory, tourFilter, stockFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const totalBalance = inventory.reduce((sum, i) => sum + i.balance, 0);
    const lowStockItems = inventory.filter((i) => i.balance > 0 && i.balance < 10).length;
    const outOfStockItems = inventory.filter((i) => i.balance === 0).length;
    const totalValue = inventory.reduce((sum, i) => sum + i.balance * i.full_package_cost, 0);

    return { totalItems, totalBalance, lowStockItems, outOfStockItems, totalValue };
  }, [inventory]);

  const columns: ColumnDef<InventoryItem>[] = useMemo(
    () => [
      {
        accessorKey: 'tour_name',
        header: 'Tour',
        cell: ({ row }) => (
          <div>
            <Link
              href={`/tours/${row.original.tour_id}`}
              className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-red-primary)] transition"
            >
              {row.original.tour_name}
            </Link>
            <div className="text-xs text-[var(--color-text-secondary)]">{row.original.artist}</div>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'sku',
        header: 'Product',
        cell: ({ row }) => {
          const balance = row.original.balance;
          const isLowStock = balance > 0 && balance < 10;
          const isOutOfStock = balance === 0;
          const noReceipts = balance < 0 && !row.original.total_received;

          return (
            <div>
              <div className="font-semibold text-[var(--color-text-primary)]">{row.getValue('sku')}</div>
              <div className="text-xs text-[var(--color-text-secondary)]">{row.original.description}</div>
              {noReceipts && (
                <Badge variant="default" size="sm" className="mt-1">
                  No received stock recorded
                </Badge>
              )}
              {isOutOfStock && (
                <Badge variant="error" size="sm" className="mt-1">
                  Out of stock
                </Badge>
              )}
              {isLowStock && (
                <Badge variant="warning" size="sm" className="mt-1">
                  Low stock
                </Badge>
              )}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-secondary)]">{row.getValue('size')}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'product_type',
        header: 'Type',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-secondary)] capitalize">
            {row.getValue('product_type')}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'total_received',
        header: 'Received',
        meta: { align: 'right' },
        cell: ({ row }) => <NumericCell value={row.getValue('total_received')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'total_sold',
        header: 'Sold',
        meta: { align: 'right' },
        cell: ({ row }) => <NumericCell value={row.getValue('total_sold')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'total_comps',
        header: 'Comps',
        meta: { align: 'right' },
        cell: ({ row }) => <NumericCell value={row.getValue('total_comps')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'balance',
        header: 'Balance',
        meta: { align: 'right' },
        cell: ({ row }) => {
          const balance = row.getValue('balance') as number;
          const isLowStock = balance > 0 && balance < 10;
          const isOutOfStock = balance === 0;

          return (
            <div
              className={`text-right font-semibold tabular-nums ${
                balance < 0
                  ? 'text-[var(--color-text-secondary)]'
                  : isOutOfStock
                  ? 'text-danger'
                  : isLowStock
                  ? 'text-warn'
                  : 'text-[var(--color-text-primary)]'
              }`}
            >
              {new Intl.NumberFormat('en-US').format(balance)}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'value',
        header: 'Value',
        meta: { align: 'right' },
        accessorFn: (row) => row.balance * row.full_package_cost,
        cell: ({ row }) => {
          const value = row.original.balance * row.original.full_package_cost;
          return <NumericCell value={value} format="currency" />;
        },
        enableSorting: true,
      },
    ],
    []
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="g-container py-6">
      <PageHeader
        title="Inventory"
        subtitle="Stock by product and size across all tours. Balance = received − sold − comps."
        breadcrumbs={breadcrumbs}
      />

      {/* Stats Grid */}
      <div data-tour="admin-inventory" className={`${STAT_GRID} mt-5 mb-5`}>
        <StatCard label="Product lines" value={stats.totalItems.toLocaleString()} iconName="package" />
        <StatCard label="Units on hand" value={stats.totalBalance.toLocaleString()} iconName="layers" />
        <StatCard label="Low stock" value={stats.lowStockItems} iconName="alert-triangle" />
        <StatCard
          label="Out of stock"
          value={stats.outOfStockItems}
          iconName="x-circle"
          color={stats.outOfStockItems > 0 ? 'red' : 'default'}
        />
        <StatCard label="Inventory value" value={formatCurrency(stats.totalValue)} iconName="package" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Tour Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
            <select
              value={tourFilter}
              onChange={(e) => setTourFilter(e.target.value)}
              aria-label="Tour"
              className="g-input"
            >
              <option value="all">All tours</option>
              {tours.map((tour) => (
                <option key={tour.id} value={tour.id}>
                  {tour.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="flex items-center gap-2">
            {(['all', 'low', 'out'] as const).map((status) => {
              const isActive = stockFilter === status;
              const labels = {
                all: 'All stock',
                low: 'Low stock',
                out: 'Out of stock',
              };
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setStockFilter(status)}
                  className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-surface)] border-[var(--color-text-primary)]'
                      : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border-[var(--color-bg-border)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {labels[status]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <SearchBar
            placeholder="Search by SKU, product or tour"
            onSearch={setSearchQuery}
            debounceMs={300}
          />
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || tourFilter !== 'all' || stockFilter !== 'all') && (
        <div className="mb-4 text-sm text-[var(--color-text-secondary)]">
          Showing {filteredInventory.length} of {inventory.length} items
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}

      {/* Data Table */}
      <div>
        <DataTable
          columns={columns}
          data={filteredInventory}
          loading={loading}
          stickyHeader
          striped
          emptyState={{
            icon: <Package className="w-12 h-12 text-[var(--color-text-secondary)]" />,
            title: 'No inventory items found',
            description: stockFilter !== 'all' || tourFilter !== 'all' || searchQuery
              ? 'Nothing matches these filters. Clear the search or pick All stock.'
              : 'Post a packing list to record received stock.',
          }}
        />
      </div>

      {/* Totals Row */}
      {filteredInventory.length > 0 && (
        <div className="mt-4 p-4 g-card">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm tabular-nums">
            <div>
              <p className="text-[var(--color-text-secondary)] text-xs mb-1">Total received</p>
              <p className="font-semibold">
                {new Intl.NumberFormat('en-US').format(
                  filteredInventory.reduce((sum, i) => sum + i.total_received, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-[var(--color-text-secondary)] text-xs mb-1">Total sold</p>
              <p className="font-semibold">
                {new Intl.NumberFormat('en-US').format(
                  filteredInventory.reduce((sum, i) => sum + i.total_sold, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-[var(--color-text-secondary)] text-xs mb-1">Total comps</p>
              <p className="font-semibold">
                {new Intl.NumberFormat('en-US').format(
                  filteredInventory.reduce((sum, i) => sum + i.total_comps, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-[var(--color-text-secondary)] text-xs mb-1">Total balance</p>
              <p className="font-semibold">
                {new Intl.NumberFormat('en-US').format(
                  filteredInventory.reduce((sum, i) => sum + i.balance, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-[var(--color-text-secondary)] text-xs mb-1">Filtered value</p>
              <p className="font-semibold">
                {formatCurrency(
                  filteredInventory.reduce((sum, i) => sum + i.balance * i.full_package_cost, 0)
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
