'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, X, ChevronDown, ChevronRight, Package, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TourProductCostEditor } from '@/components/products/TourProductCostEditor';
import { AddProductToTourModal } from '@/components/products/AddProductToTourModal';

interface TourProductSize {
  tour_product_id: string;
  size: string;
  blank_unit_cost: number;
  print_unit_cost: number;
  full_package_cost: number;
  suggested_retail: number | null;
  is_active: boolean;
  inventory_balance: number;
}

interface TourProduct {
  product_id: string;
  sku: string;
  description: string;
  product_type: string;
  sizes: TourProductSize[];
}

interface Tour {
  id: string;
  name: string;
  artist_name: string;
}

export default function TourProductsPage() {
  const params = useParams();
  const router = useRouter();
  const tourId = params.id as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [products, setProducts] = useState<TourProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);

  const breadcrumbs = generateBreadcrumbs([
    { label: 'Admin', href: '/admin' },
    { label: 'Tours', href: '/admin' },
    { label: tour?.name || 'Loading...', href: `/tours/${tourId}` },
    { label: 'Products' },
  ]);

  // Fetch tour info
  useEffect(() => {
    const fetchTour = async () => {
      try {
        const res = await fetch(`/api/tours/${tourId}`);
        if (res.ok) {
          const data = await res.json();
          setTour(data);
        }
      } catch (err) {
        console.error('Error fetching tour:', err);
      }
    };
    fetchTour();
  }, [tourId]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tours/${tourId}/products`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter products by search
  const filteredProducts = products.filter(
    (p) =>
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  // Toggle product expansion
  const toggleExpanded = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  // Expand all
  const expandAll = () => {
    setExpandedProducts(new Set(filteredProducts.map((p) => p.product_id)));
  };

  // Collapse all
  const collapseAll = () => {
    setExpandedProducts(new Set());
  };

  // Handle cost update
  const handleCostUpdate = async (
    tourProductId: string,
    updates: { blank_unit_cost?: number; print_unit_cost?: number; suggested_retail?: number | null }
  ) => {
    try {
      const res = await fetch(`/api/tours/${tourId}/products/${tourProductId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update');
      }

      // Refresh products
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to update cost');
    }
  };

  // Handle toggle active
  const handleToggleActive = async (tourProductId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/tours/${tourId}/products/${tourProductId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update');
      }

      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  // Handle remove product
  const handleRemoveProduct = async (tourProductId: string, sku: string, size: string) => {
    if (!confirm(`Remove ${sku} (${size}) from this tour?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/tours/${tourId}/products/${tourProductId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to remove');
      }

      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to remove product');
    }
  };

  // Get type badge variant
  const getTypeBadgeVariant = (type: string): 'default' | 'active' | 'info' | 'warning' => {
    const variants: Record<string, 'default' | 'active' | 'info' | 'warning'> = {
      apparel: 'active',
      accessories: 'info',
      media: 'warning',
      'paper-items': 'default',
      other: 'default',
    };
    return variants[type] || 'default';
  };

  return (
    <div className="g-container py-12">
      <PageHeader
        title="Tour Products"
        subtitle={tour ? `Manage products and costs for ${tour.name}` : 'Loading tour...'}
        kicker={tour?.artist_name || 'Admin'}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex items-center gap-3">
            <Link href={`/tours/${tourId}`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tour
              </Button>
            </Link>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        }
      />

      {/* Search and Controls */}
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--g-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU or description..."
            className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[var(--g-text)] placeholder-[var(--g-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--g-accent)] focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--g-text-muted)] hover:text-[var(--g-text)] transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-[var(--g-text-muted)]">
        {loading ? (
          'Loading...'
        ) : (
          <>
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} with{' '}
            {filteredProducts.reduce((sum, p) => sum + p.sizes.length, 0)} size variants
            {search && ` matching "${search}"`}
          </>
        )}
      </div>

      {/* Products List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--g-accent)]"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="w-12 h-12 text-[var(--g-text-muted)] mb-4" />
          <h3 className="text-lg font-semibold text-[var(--g-text)] mb-2">
            {search ? 'No products found' : 'No products added yet'}
          </h3>
          <p className="text-sm text-[var(--g-text-muted)] mb-4">
            {search
              ? 'Try a different search term'
              : 'Add products to this tour to manage costs and inventory'}
          </p>
          {!search && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Product
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const isExpanded = expandedProducts.has(product.product_id);
            const activeCount = product.sizes.filter((s) => s.is_active).length;
            const totalInventory = product.sizes.reduce((sum, s) => sum + s.inventory_balance, 0);

            return (
              <div
                key={product.product_id}
                className="border border-slate-200 rounded-lg bg-[var(--g-surface)] overflow-hidden"
              >
                {/* Product Header */}
                <button
                  onClick={() => toggleExpanded(product.product_id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-4">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-[var(--g-text-muted)]" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-[var(--g-text-muted)]" />
                    )}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--g-text)]">{product.sku}</span>
                        <Badge variant={getTypeBadgeVariant(product.product_type)} size="sm">
                          {product.product_type.replace('-', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--g-text-dim)]">{product.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <span className="text-[var(--g-text-muted)]">Sizes:</span>{' '}
                      <span className="text-[var(--g-text)]">
                        {activeCount}/{product.sizes.length}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[var(--g-text-muted)]">Inventory:</span>{' '}
                      <span className="text-[var(--g-text)]">{totalInventory}</span>
                    </div>
                  </div>
                </button>

                {/* Expanded Content - Size Details */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50/50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[var(--g-text-muted)]">
                          <th className="pb-2 font-medium">Size</th>
                          <th className="pb-2 font-medium text-right">Blank Cost</th>
                          <th className="pb-2 font-medium text-right">Print Cost</th>
                          <th className="pb-2 font-medium text-right">Total Cost</th>
                          <th className="pb-2 font-medium text-right">Retail</th>
                          <th className="pb-2 font-medium text-right">Inventory</th>
                          <th className="pb-2 font-medium text-center">Status</th>
                          <th className="pb-2 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {product.sizes.map((sizeData) => (
                          <TourProductCostEditor
                            key={sizeData.tour_product_id}
                            tourProductId={sizeData.tour_product_id}
                            sku={product.sku}
                            size={sizeData.size}
                            blankCost={sizeData.blank_unit_cost}
                            printCost={sizeData.print_unit_cost}
                            fullPackageCost={sizeData.full_package_cost}
                            suggestedRetail={sizeData.suggested_retail}
                            inventoryBalance={sizeData.inventory_balance}
                            isActive={sizeData.is_active}
                            onUpdate={handleCostUpdate}
                            onToggleActive={handleToggleActive}
                            onRemove={handleRemoveProduct}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductToTourModal
          tourId={tourId}
          tourName={tour?.name || ''}
          existingProductIds={products.map((p) => p.product_id)}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
