'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { Button } from '@/components/ui/Button';
import {
  ProductCatalogTable,
  type ProductRow,
} from '@/components/admin/products/ProductCatalogTable';
import {
  ProductFilters,
  type ProductTypeFilter,
} from '@/components/admin/products/ProductFilters';
import {
  ProductForm,
  type ProductFormData,
} from '@/components/admin/products/ProductForm';

interface ProductsResponse {
  products: ProductRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProductTypeFilter>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    limit: 50,
  });

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const breadcrumbs = generateBreadcrumbs([
    { label: 'Admin', href: '/admin' },
    { label: 'Products' },
  ]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.set('search', search);
      if (filter !== 'all') params.set('type', filter);

      const res = await fetch(`/api/products?${params}`);
      const data: ProductsResponse = await res.json();

      setProducts(data.products || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filter, pagination.limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  // Count products by type for filter badges
  const typeCounts = products.reduce(
    (acc, p) => {
      acc.all++;
      const type = p.product_type as ProductTypeFilter;
      if (acc[type] !== undefined) {
        acc[type]++;
      } else {
        acc.other++;
      }
      return acc;
    },
    { all: 0, apparel: 0, accessories: 0, media: 0, 'paper-items': 0, other: 0 }
  );

  // Handle create/edit form submission
  const handleFormSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      const isEdit = !!editingProduct;
      const url = isEdit ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save product');
      }

      setShowForm(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle batch submission from AI upload
  const handleBatchSubmit = async (products: ProductFormData[]) => {
    setIsSubmitting(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      for (const product of products) {
        try {
          const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product),
          });

          if (!res.ok) {
            const error = await res.json();
            errors.push(`${product.sku}: ${error.error || 'Failed to create'}`);
          } else {
            successCount++;
          }
        } catch (err: any) {
          errors.push(`${product.sku}: ${err.message || 'Failed to create'}`);
        }
      }

      if (errors.length > 0) {
        if (successCount > 0) {
          alert(`Added ${successCount} products. ${errors.length} failed:\n${errors.join('\n')}`);
        } else {
          throw new Error(`Failed to add products:\n${errors.join('\n')}`);
        }
      }

      setShowForm(false);
      fetchProducts();
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (product: ProductRow) => {
    if (!confirm(`Are you sure you want to delete "${product.sku}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.message || error.error || 'Failed to delete product');
        return;
      }

      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Failed to delete product');
    }
  };

  // Handle edit
  const handleEdit = (product: ProductRow) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  return (
    <div className="g-container py-12">
      <PageHeader
        title="Product Catalog"
        subtitle="Manage the global product catalog. Products can be assigned to multiple tours with tour-specific pricing."
        kicker="Admin"
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Product
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--g-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU or description..."
            className="w-full pl-10 pr-10 py-2 bg-white/5 border border-white/10 rounded-lg text-[var(--g-text)] placeholder-[var(--g-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--g-accent)] focus:border-transparent"
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

        <ProductFilters
          activeFilter={filter}
          onFilterChange={setFilter}
          counts={filter === 'all' ? undefined : typeCounts}
        />
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-[var(--g-text-muted)]">
        {loading ? (
          'Loading...'
        ) : (
          <>
            Found {pagination.total} product{pagination.total !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
            {filter !== 'all' && ` in ${filter.replace('-', ' ')}`}
          </>
        )}
      </div>

      {/* Products Table */}
      <ProductCatalogTable
        products={products}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-[var(--g-text-muted)]">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <ProductForm
          product={
            editingProduct
              ? {
                  sku: editingProduct.sku,
                  description: editingProduct.description,
                  product_type: editingProduct.product_type,
                }
              : undefined
          }
          onSubmit={handleFormSubmit}
          onBatchSubmit={handleBatchSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
