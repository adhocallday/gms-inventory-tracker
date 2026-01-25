'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface TourData {
  name: string;
  artist: string;
}

interface Product {
  sku: string;
  name: string;
  category: string;
  basePrice: number;
  sizes: string[];
  imageUrl?: string;
}

interface ProductCatalogStepProps {
  tourData: TourData;
  products: Product[];
  onUpdate: (products: Product[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function ProductCatalogStep({ tourData, products, onUpdate, onNext, onPrev }: ProductCatalogStepProps) {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tourName', tourData.name);
      formData.append('artist', tourData.artist);

      const response = await fetch('/api/admin/parse-products', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse products');
      }

      const result = await response.json();
      onUpdate([...products, ...result.products]);
    } catch (err: any) {
      setError(err.message);
      console.error('Product parse error:', err);
    } finally {
      setParsing(false);
    }
  }, [tourData, products, onUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  });

  const addManualProduct = () => {
    const newProduct: Product = {
      sku: '',
      name: '',
      category: 'Apparel',
      basePrice: 0,
      sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL']
    };
    onUpdate([...products, newProduct]);
  };

  const updateProduct = (index: number, field: keyof Product, value: any) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
  };

  const removeProduct = (index: number) => {
    onUpdate(products.filter((_, i) => i !== index));
  };

  const toggleSize = (productIndex: number, size: string) => {
    const updated = [...products];
    const product = updated[productIndex];
    const sizes = product.sizes.includes(size)
      ? product.sizes.filter(s => s !== size)
      : [...product.sizes, size];
    updated[productIndex] = { ...product, sizes };
    onUpdate(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (products.length === 0) {
      alert('Please add at least one product');
      return;
    }
    const invalid = products.some(p => !p.sku || !p.name || p.basePrice <= 0);
    if (invalid) {
      alert('All products must have SKU, name, and price');
      return;
    }
    onNext();
  };

  const allSizes = ['S', 'M', 'L', 'XL', '2XL', '3XL', 'One-Size'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold g-title mb-4">Product Catalog</h2>
        <p className="text-sm text-[var(--g-text-dim)]">
          Upload a product catalog or grab sheet (PDF/CSV/Excel), or add products manually.
          AI will extract SKUs, names, categories, and pricing.
        </p>
      </div>

      {/* AI Upload Area */}
      <div className="p-6 border border-white/10 rounded-lg bg-[var(--g-surface-2)]">
        <h3 className="text-sm font-semibold text-[var(--g-text)] mb-3">
          AI-Assisted Upload
        </h3>
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
              <p className="text-sm text-[var(--g-text-dim)]">Parsing product catalog with AI...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <svg className="mx-auto h-10 w-10 text-[var(--g-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-[var(--g-text-dim)]">
                {isDragActive ? 'Drop the file here' : 'Drag & drop product catalog or grab sheet, or click to select'}
              </p>
              <p className="text-xs text-[var(--g-text-muted)]">
                Supports PDF, CSV, Excel, or product images
              </p>
            </div>
          )}
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--g-text)]">
            Products ({products.length})
          </h3>
          <button
            type="button"
            onClick={addManualProduct}
            className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-medium"
          >
            + Add Product Manually
          </button>
        </div>

        {products.length > 0 ? (
          <div className="space-y-4">
            {products.map((product, index) => (
              <div key={index} className="border border-white/10 rounded-lg p-4 bg-[var(--g-surface)]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-[var(--g-text-muted)] block mb-1">SKU *</label>
                    <input
                      type="text"
                      className="g-input text-sm w-full"
                      placeholder="GHOSRX203729BK"
                      value={product.sku}
                      onChange={(e) => updateProduct(index, 'sku', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--g-text-muted)] block mb-1">Product Name *</label>
                    <input
                      type="text"
                      className="g-input text-sm w-full"
                      placeholder="Ghost T-Shirt Black"
                      value={product.name}
                      onChange={(e) => updateProduct(index, 'name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--g-text-muted)] block mb-1">Base Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="g-input text-sm w-full"
                      placeholder="30.00"
                      value={product.basePrice || ''}
                      onChange={(e) => updateProduct(index, 'basePrice', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-[var(--g-text-muted)] block mb-2">Sizes Available</label>
                  <div className="flex flex-wrap gap-2">
                    {allSizes.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(index, size)}
                        className={`
                          px-3 py-1 text-xs rounded-lg border transition
                          ${product.sizes.includes(size)
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

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove Product
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-white/10 rounded-lg p-8 text-center">
            <p className="text-sm text-[var(--g-text-muted)]">
              No products added yet. Upload a catalog or add products manually.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-white/10">
        <button
          type="button"
          onClick={onPrev}
          className="px-6 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition text-[var(--g-text)]"
        >
          ← Previous
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition font-semibold"
        >
          Next: Set Initial Stock →
        </button>
      </div>
    </form>
  );
}
