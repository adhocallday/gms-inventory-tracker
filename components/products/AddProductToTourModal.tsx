'use client';

import { useState, useEffect } from 'react';
import { X, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Product {
  id: string;
  sku: string;
  description: string;
  product_type: string;
  tour_count: number;
}

interface AddProductToTourModalProps {
  tourId: string;
  tourName: string;
  existingProductIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const allSizes = ['S', 'M', 'L', 'XL', '2XL', '3XL', 'One-Size'];

const defaultSizesByType: Record<string, string[]> = {
  apparel: ['S', 'M', 'L', 'XL', '2XL'],
  accessories: ['One-Size'],
  media: ['One-Size'],
  'paper-items': ['One-Size'],
  other: ['One-Size'],
};

export function AddProductToTourModal({
  tourId,
  tourName,
  existingProductIds,
  onClose,
  onSuccess,
}: AddProductToTourModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
  const [costs, setCosts] = useState({
    blank_unit_cost: 0,
    print_unit_cost: 0,
    suggested_retail: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?limit=500');
        const data = await res.json();
        // Filter out products already in this tour
        const available = (data.products || []).filter(
          (p: Product) => !existingProductIds.includes(p.id)
        );
        setProducts(available);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [existingProductIds]);

  // Filter products by search
  const filteredProducts = products.filter(
    (p) =>
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  // Handle product selection
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    // Set default sizes based on product type
    const defaultSizes = defaultSizesByType[product.product_type] || ['One-Size'];
    setSelectedSizes(new Set(defaultSizes));
    setError(null);
  };

  // Toggle size
  const toggleSize = (size: string) => {
    const newSizes = new Set(selectedSizes);
    if (newSizes.has(size)) {
      newSizes.delete(size);
    } else {
      newSizes.add(size);
    }
    setSelectedSizes(newSizes);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedProduct) return;
    if (selectedSizes.size === 0) {
      setError('Please select at least one size');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tours/${tourId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          sizes: Array.from(selectedSizes),
          blank_unit_cost: costs.blank_unit_cost,
          print_unit_cost: costs.print_unit_cost,
          suggested_retail: costs.suggested_retail || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add product');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--color-bg-base)] border border-white/10 rounded-xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold g-title">Add Product to {tourName}</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-4 mt-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </div>
          )}

          {!selectedProduct ? (
            /* Product Selection */
            <div className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products by SKU or description..."
                  className="w-full pl-10 pr-4 py-2 bg-[var(--color-bg-surface)]/5 border border-white/10 rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)] focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Product List */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-red-primary)]"></div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="w-12 h-12 text-[var(--color-text-muted)] mb-4" />
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {search
                      ? 'No products found matching your search'
                      : 'All products have been added to this tour'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="w-full text-left p-3 border border-white/10 rounded-lg hover:bg-[var(--color-bg-surface)]/5 hover:border-white/20 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[var(--color-text-primary)]">
                              {product.sku}
                            </span>
                            <Badge variant={getTypeBadgeVariant(product.product_type)} size="sm">
                              {product.product_type.replace('-', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)]">{product.description}</p>
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {product.tour_count} tour{product.tour_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Size and Cost Configuration */
            <div className="p-4 space-y-6">
              {/* Selected Product */}
              <div className="p-3 bg-[var(--color-red-primary)]/10 border border-[var(--color-red-primary)]/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {selectedProduct.sku}
                      </span>
                      <Badge
                        variant={getTypeBadgeVariant(selectedProduct.product_type)}
                        size="sm"
                      >
                        {selectedProduct.product_type.replace('-', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{selectedProduct.description}</p>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-sm text-[var(--color-red-primary)] hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Size Selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  Select Sizes
                </label>
                <div className="flex flex-wrap gap-2">
                  {allSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`
                        px-3 py-1.5 text-sm rounded-lg border transition
                        ${
                          selectedSizes.has(size)
                            ? 'bg-[var(--color-red-primary)] border-[var(--color-red-primary)] text-white'
                            : 'border-white/20 text-[var(--color-text-secondary)] hover:border-white/40'
                        }
                      `}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost Configuration */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                    Blank Cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={costs.blank_unit_cost || ''}
                      onChange={(e) =>
                        setCosts({ ...costs, blank_unit_cost: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full pl-7 pr-3 py-2 bg-[var(--color-bg-surface)]/5 border border-white/10 rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)]"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                    Print Cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={costs.print_unit_cost || ''}
                      onChange={(e) =>
                        setCosts({ ...costs, print_unit_cost: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full pl-7 pr-3 py-2 bg-[var(--color-bg-surface)]/5 border border-white/10 rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)]"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                    Suggested Retail
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={costs.suggested_retail || ''}
                      onChange={(e) =>
                        setCosts({ ...costs, suggested_retail: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full pl-7 pr-3 py-2 bg-[var(--color-bg-surface)]/5 border border-white/10 rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)]"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Total Cost Preview */}
              <div className="p-3 bg-[var(--color-bg-surface)]/5 border border-white/10 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">Total Package Cost:</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    ${(costs.blank_unit_cost + costs.print_unit_cost).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-white/10">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {selectedProduct && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedSizes.size === 0}
            >
              {isSubmitting
                ? 'Adding...'
                : `Add ${selectedSizes.size} Size${selectedSizes.size !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
