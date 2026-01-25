'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ProductFormData {
  sku: string;
  description: string;
  product_type: string;
}

interface ProductFormProps {
  product?: ProductFormData;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const productTypes = [
  { value: 'apparel', label: 'Apparel' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'media', label: 'Media' },
  { value: 'paper-items', label: 'Paper Items' },
  { value: 'other', label: 'Other' },
];

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  isSubmitting,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    sku: product?.sku || '',
    description: product?.description || '',
    product_type: product?.product_type || 'apparel',
  });
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!product;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.sku.trim()) {
      setError('SKU is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--g-bg)] border border-white/10 rounded-xl w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold g-title">
            {isEditMode ? 'Edit Product' : 'Create New Product'}
          </h2>
          <button
            onClick={onCancel}
            className="text-[var(--g-text-muted)] hover:text-[var(--g-text)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--g-text-muted)] mb-1">
              SKU <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[var(--g-text)] placeholder-[var(--g-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--g-accent)] focus:border-transparent"
              placeholder="e.g., TSHIRT-BLK-001"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--g-text-muted)] mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[var(--g-text)] placeholder-[var(--g-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--g-accent)] focus:border-transparent"
              placeholder="e.g., Black Tour T-Shirt"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--g-text-muted)] mb-1">
              Product Type
            </label>
            <select
              value={formData.product_type}
              onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[var(--g-text)] focus:outline-none focus:ring-2 focus:ring-[var(--g-accent)] focus:border-transparent"
              disabled={isSubmitting}
            >
              {productTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode
                  ? 'Saving...'
                  : 'Creating...'
                : isEditMode
                ? 'Save Changes'
                : 'Create Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
