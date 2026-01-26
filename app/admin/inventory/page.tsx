'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Package, AlertTriangle, TrendingDown, Filter } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { StatCard } from '@/components/dashboard/StatCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { Badge } from '@/components/ui/Badge';
import { DataTable, NumericCell } from '@/components/ui/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import { supabase } from '@/lib/supabase/client';
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

      // Fetch tours
      const { data: toursData } = await supabase
        .from('tours')
        .select('id, name, artist, status')
        .order('name');

      // Fetch inventory balances with product info
      const { data: inventoryData } = await supabase
        .from('inventory_balances')
        .select(`
          tour_id,
          product_id,
          size,
          total_received,
          total_sold,
          total_comps,
          balance
        `);

      // Fetch products for SKU and description
      const { data: products } = await supabase
        .from('products')
        .select('id, sku, description, product_type, full_package_cost');

      // Fetch tour products for mapping
      const { data: tourProducts } = await supabase
        .from('tour_products')
        .select('tour_id, product_id, size');

      // Create lookup maps
      const tourMap = new Map<string, Tour>();
      for (const tour of toursData ?? []) {
        tourMap.set(tour.id, tour);
      }

      const productMap = new Map<string, any>();
      for (const product of products ?? []) {
        productMap.set(product.id, product);
      }

      // Transform inventory data
      const enrichedInventory: InventoryItem[] = (inventoryData ?? [])
        .map((item) => {
          const tour = tourMap.get(item.tour_id);
          const product = productMap.get(item.product_id);
          if (!tour || !product) return null;

          return {
            tour_id: item.tour_id,
            tour_name: tour.name,
            artist: tour.artist,
            product_id: item.product_id,
            sku: product.sku,
            description: product.description,
            size: item.size,
            product_type: product.product_type,
            total_received: item.total_received,
            total_sold: item.total_sold,
            total_comps: item.total_comps,
            balance: item.balance,
            full_package_cost: product.full_package_cost ?? 0,
          };
        })
        .filter((item): item is InventoryItem => item !== null);

      setTours(toursData ?? []);
      setInventory(enrichedInventory);
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
              className="font-medium text-[var(--g-text)] hover:text-[var(--g-accent)] transition"
            >
              {row.original.tour_name}
            </Link>
            <div className="text-xs text-[var(--g-text-muted)]">{row.original.artist}</div>
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

          return (
            <div>
              <div className="font-semibold text-[var(--g-text)]">{row.getValue('sku')}</div>
              <div className="text-xs text-[var(--g-text-muted)]">{row.original.description}</div>
              {isOutOfStock && (
                <Badge variant="error" className="mt-1 text-xs">
                  Out of stock
                </Badge>
              )}
              {isLowStock && (
                <Badge variant="warning" className="mt-1 text-xs">
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
          <span className="text-[var(--g-text-dim)]">{row.getValue('size')}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'product_type',
        header: 'Type',
        cell: ({ row }) => (
          <span className="text-[var(--g-text-dim)] capitalize">
            {row.getValue('product_type')}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'total_received',
        header: 'Received',
        cell: ({ row }) => <NumericCell value={row.getValue('total_received')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'total_sold',
        header: 'Sold',
        cell: ({ row }) => <NumericCell value={row.getValue('total_sold')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'total_comps',
        header: 'Comps',
        cell: ({ row }) => <NumericCell value={row.getValue('total_comps')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'balance',
        header: 'Balance',
        cell: ({ row }) => {
          const balance = row.getValue('balance') as number;
          const isLowStock = balance > 0 && balance < 10;
          const isOutOfStock = balance === 0;

          return (
            <div
              className={`text-right font-semibold ${
                isOutOfStock
                  ? 'text-red-400'
                  : isLowStock
                  ? 'text-yellow-400'
                  : 'text-green-400'
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
    <div className="g-container py-12">
      <PageHeader
        title="Inventory Overview"
        subtitle="View and manage inventory levels across all tours. Monitor stock levels, identify low stock items, and track inventory movement."
        kicker="Admin Portal"
        breadcrumbs={breadcrumbs}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Total Items"
          value={stats.totalItems}
          iconName="package"
          color="purple"
        />
        <StatCard
          label="Units on Hand"
          value={stats.totalBalance}
          iconName="layers"
          color="blue"
        />
        <StatCard
          label="Low Stock Items"
          value={stats.lowStockItems}
          iconName="alert-triangle"
          color="orange"
        />
        <StatCard
          label="Out of Stock"
          value={stats.outOfStockItems}
          iconName="x-circle"
          color="red"
        />
        <div className="g-card p-6">
          <p className="text-xs text-[var(--g-text-muted)] uppercase tracking-wide">
            Total Inventory Value
          </p>
          <p className="text-2xl font-bold mt-2">{formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Tour Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--g-text-muted)]" />
            <select
              value={tourFilter}
              onChange={(e) => setTourFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--g-surface-2)] border border-[var(--g-border)] text-sm text-[var(--g-text)] focus:outline-none focus:ring-2 focus:ring-[var(--g-accent)]/50"
            >
              <option value="all">All Tours</option>
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
                all: 'All Stock',
                low: 'Low Stock',
                out: 'Out of Stock',
              };
              return (
                <button
                  key={status}
                  onClick={() => setStockFilter(status)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--g-accent)] text-white'
                      : 'bg-[var(--g-surface-2)] text-[var(--g-text-dim)] hover:bg-[var(--g-surface)] hover:text-[var(--g-text)]'
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
            placeholder="Search by SKU, product, tour..."
            onSearch={setSearchQuery}
            debounceMs={300}
          />
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || tourFilter !== 'all' || stockFilter !== 'all') && (
        <div className="mb-4 text-sm text-[var(--g-text-muted)]">
          Showing {filteredInventory.length} of {inventory.length} items
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}

      {/* Data Table */}
      <div className="g-card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredInventory}
          loading={loading}
          stickyHeader
          striped
          emptyState={{
            icon: <Package className="w-12 h-12 text-[var(--g-text-muted)]" />,
            title: 'No inventory items found',
            description: stockFilter !== 'all' || tourFilter !== 'all' || searchQuery
              ? 'Try adjusting your filters or search criteria'
              : 'Upload packing lists or purchase orders to see inventory',
          }}
        />
      </div>

      {/* Totals Row */}
      {filteredInventory.length > 0 && (
        <div className="mt-4 p-4 g-card">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Total Received</p>
              <p className="font-semibold">
                {new Intl.NumberFormat('en-US').format(
                  filteredInventory.reduce((sum, i) => sum + i.total_received, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Total Sold</p>
              <p className="font-semibold">
                {new Intl.NumberFormat('en-US').format(
                  filteredInventory.reduce((sum, i) => sum + i.total_sold, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Total Comps</p>
              <p className="font-semibold">
                {new Intl.NumberFormat('en-US').format(
                  filteredInventory.reduce((sum, i) => sum + i.total_comps, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Total Balance</p>
              <p className="font-semibold text-green-400">
                {new Intl.NumberFormat('en-US').format(
                  filteredInventory.reduce((sum, i) => sum + i.balance, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Filtered Value</p>
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
