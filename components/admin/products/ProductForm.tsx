'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ProductFormData {
  sku: string;
  description: string;
  product_type: string;
  sizes?: string[];
}

interface ParsedProduct {
  sku: string;
  name: string;
  category: string;
  basePrice: number;
  sizes: string[];
  imageDataUrl?: string;
}

interface ProductFormProps {
  product?: ProductFormData;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onBatchSubmit?: (products: ProductFormData[]) => Promise<void>;
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

const allSizes = ['S', 'M', 'L', 'XL', '2XL', '3XL', 'One-Size'];

// Map AI categories to our product types
const categoryToProductType: Record<string, string> = {
  'T-Shirt': 'apparel',
  'Long-Sleeve': 'apparel',
  'Hoodie': 'apparel',
  'Sweatshirt': 'apparel',
  'Tank': 'apparel',
  'Hat': 'accessories',
  'Bag': 'accessories',
  'Accessory': 'accessories',
  'Poster': 'paper-items',
  'Vinyl': 'media',
  'CD': 'media',
  'Other': 'other',
};

export function ProductForm({
  product,
  onSubmit,
  onBatchSubmit,
  onCancel,
  isSubmitting,
}: ProductFormProps) {
  const [mode, setMode] = useState<'manual' | 'upload'>(product ? 'manual' : 'upload');
  const [formData, setFormData] = useState<ProductFormData>({
    sku: product?.sku || '',
    description: product?.description || '',
    product_type: product?.product_type || 'apparel',
  });
  const [error, setError] = useState<string | null>(null);

  // AI Upload state
  const [parsing, setParsing] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());

  const isEditMode = !!product;

  // Handle file drop for AI parsing
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tourName', 'Product Catalog'); // Generic context for standalone parsing

      const response = await fetch('/api/admin/parse-products', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse products');
      }

      const result = await response.json();

      if (result.products && result.products.length > 0) {
        setParsedProducts(result.products);
        // Select all products by default
        setSelectedProducts(new Set(result.products.map((_: ParsedProduct, i: number) => i)));
      } else {
        setError('No products found in the uploaded file. Try a different file or add products manually.');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Product parse error:', err);
    } finally {
      setParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    disabled: parsing,
  });

  // Toggle product selection
  const toggleProduct = (index: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
  };

  // Toggle all products
  const toggleAll = () => {
    if (selectedProducts.size === parsedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(parsedProducts.map((_, i) => i)));
    }
  };

  // Update a parsed product
  const updateParsedProduct = (index: number, field: keyof ParsedProduct, value: any) => {
    const updated = [...parsedProducts];
    updated[index] = { ...updated[index], [field]: value };
    setParsedProducts(updated);
  };

  // Remove a parsed product
  const removeParsedProduct = (index: number) => {
    setParsedProducts(parsedProducts.filter((_, i) => i !== index));
    const newSelected = new Set(selectedProducts);
    newSelected.delete(index);
    // Adjust indices for remaining selected items
    const adjustedSelected = new Set<number>();
    newSelected.forEach((i) => {
      if (i > index) {
        adjustedSelected.add(i - 1);
      } else {
        adjustedSelected.add(i);
      }
    });
    setSelectedProducts(adjustedSelected);
  };

  // Toggle size for a parsed product
  const toggleParsedProductSize = (productIndex: number, size: string) => {
    const updated = [...parsedProducts];
    const product = updated[productIndex];
    const sizes = product.sizes.includes(size)
      ? product.sizes.filter((s) => s !== size)
      : [...product.sizes, size];
    updated[productIndex] = { ...product, sizes };
    setParsedProducts(updated);
  };

  // Handle manual form submission
  const handleManualSubmit = async (e: React.FormEvent) => {
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

  // Handle batch submission from AI upload
  const handleBatchSubmit = async () => {
    if (selectedProducts.size === 0) {
      setError('Please select at least one product to add');
      return;
    }

    setError(null);

    // Convert parsed products to ProductFormData format
    const productsToAdd: ProductFormData[] = parsedProducts
      .filter((_, i) => selectedProducts.has(i))
      .map((p) => ({
        sku: p.sku,
        description: p.name,
        product_type: categoryToProductType[p.category] || 'other',
        sizes: p.sizes,
      }));

    try {
      if (onBatchSubmit) {
        await onBatchSubmit(productsToAdd);
      } else {
        // Fallback: submit one at a time
        for (const product of productsToAdd) {
          await onSubmit(product);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--g-bg)] border border-white/10 rounded-xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold g-title">
            {isEditMode ? 'Edit Product' : 'Add Products'}
          </h2>
          <button
            onClick={onCancel}
            className="text-[var(--g-text-muted)] hover:text-[var(--g-text)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle (only for create) */}
        {!isEditMode && (
          <div className="flex border-b border-white/10">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                mode === 'upload'
                  ? 'text-[var(--g-accent)] border-b-2 border-[var(--g-accent)]'
                  : 'text-[var(--g-text-muted)] hover:text-[var(--g-text)]'
              }`}
            >
              <Upload className="w-4 h-4 inline-block mr-2" />
              AI Upload
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                mode === 'manual'
                  ? 'text-[var(--g-accent)] border-b-2 border-[var(--g-accent)]'
                  : 'text-[var(--g-text-muted)] hover:text-[var(--g-text)]'
              }`}
            >
              <FileText className="w-4 h-4 inline-block mr-2" />
              Manual Entry
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </div>
          )}

          {mode === 'manual' || isEditMode ? (
            /* Manual Entry Form */
            <form onSubmit={handleManualSubmit} className="space-y-4">
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
          ) : (
            /* AI Upload Mode */
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
                  ${isDragActive ? 'border-[var(--g-accent)] bg-[rgba(225,6,20,0.08)]' : 'border-white/15 hover:border-white/30'}
                  ${parsing ? 'pointer-events-none opacity-50' : ''}
                `}
              >
                <input {...getInputProps()} />
                {parsing ? (
                  <div className="space-y-2">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--g-accent)] mx-auto"></div>
                    <p className="text-sm text-[var(--g-text-dim)]">
                      Parsing product catalog with AI...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-10 w-10 text-[var(--g-text-muted)]" />
                    <p className="text-sm text-[var(--g-text-dim)]">
                      {isDragActive
                        ? 'Drop the file here'
                        : 'Drag & drop product catalog or grab sheet, or click to select'}
                    </p>
                    <p className="text-xs text-[var(--g-text-muted)]">
                      Supports PDF, CSV, Excel, or product images
                    </p>
                  </div>
                )}
              </div>

              {/* Parsed Products List */}
              {parsedProducts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[var(--g-text)]">
                      Parsed Products ({parsedProducts.length})
                    </h3>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-xs text-[var(--g-accent)] hover:underline"
                    >
                      {selectedProducts.size === parsedProducts.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {parsedProducts.map((product, index) => (
                      <div
                        key={index}
                        className={`
                          border rounded-lg p-4 transition
                          ${selectedProducts.has(index) ? 'border-[var(--g-accent)]/50 bg-[var(--g-accent)]/5' : 'border-white/10 bg-white/5'}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(index)}
                            onChange={() => toggleProduct(index)}
                            className="mt-1 rounded border-white/20"
                          />
                          <div className="flex-1 min-w-0 space-y-3">
                            {/* SKU and Category Row */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={product.sku}
                                onChange={(e) =>
                                  updateParsedProduct(index, 'sku', e.target.value.toUpperCase())
                                }
                                className="font-mono text-sm bg-transparent border-b border-transparent hover:border-white/20 focus:border-[var(--g-accent)] focus:outline-none text-[var(--g-text)]"
                                placeholder="SKU"
                              />
                              <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-[var(--g-text-muted)]">
                                {product.category}
                              </span>
                            </div>

                            {/* Product Name */}
                            <input
                              type="text"
                              value={product.name}
                              onChange={(e) => updateParsedProduct(index, 'name', e.target.value)}
                              className="w-full text-sm bg-transparent border-b border-transparent hover:border-white/20 focus:border-[var(--g-accent)] focus:outline-none text-[var(--g-text-dim)]"
                              placeholder="Product name"
                            />

                            {/* Sizes Row */}
                            <div>
                              <label className="text-xs text-[var(--g-text-muted)] block mb-1.5">
                                Available Sizes
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {allSizes.map((size) => (
                                  <button
                                    key={size}
                                    type="button"
                                    onClick={() => toggleParsedProductSize(index, size)}
                                    className={`
                                      px-2 py-0.5 text-xs rounded border transition
                                      ${
                                        product.sizes.includes(size)
                                          ? 'bg-[var(--g-accent)] border-[var(--g-accent)] text-white'
                                          : 'border-white/20 text-[var(--g-text-dim)] hover:border-white/40'
                                      }
                                    `}
                                  >
                                    {size}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeParsedProduct(index)}
                            className="text-[var(--g-text-muted)] hover:text-red-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBatchSubmit}
                      disabled={isSubmitting || selectedProducts.size === 0}
                    >
                      {isSubmitting
                        ? 'Adding...'
                        : `Add ${selectedProducts.size} Product${selectedProducts.size !== 1 ? 's' : ''}`}
                    </Button>
                  </div>
                </div>
              )}

              {/* Show cancel button if no products parsed yet */}
              {parsedProducts.length === 0 && !parsing && (
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
