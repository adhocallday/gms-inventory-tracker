'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { readJsonResponse } from '@/lib/http/read-json';
import { ArrowLeft, ArrowRight, UploadCloud } from 'lucide-react';

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
  imageDataUrl?: string; // Base64 data URL for product image from PDF
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
      const result = await readJsonResponse(response);
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
        <h2 className="text-xl font-semibold mb-4">Product catalog</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Upload a product catalog or grab sheet (PDF/CSV/Excel), or add products manually.
          AI will extract SKUs, names, categories, and pricing.
        </p>
      </div>

      {/* AI Upload Area */}
      <div className="p-6 border border-[var(--color-bg-border)] rounded-lg bg-[var(--color-bg-elevated)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
          AI-Assisted Upload
        </h3>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
            ${isDragActive ? 'border-[var(--color-red-primary)] bg-[rgba(225,6,20,0.08)]' : 'border-[var(--color-bg-border)] hover:border-[var(--color-text-muted)]'}
            ${parsing ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          {parsing ? (
            <div className="space-y-2">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-red-primary)] mx-auto"></div>
              <p className="text-sm text-[var(--color-text-secondary)]">Parsing product catalog with AI...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <UploadCloud className="mx-auto h-10 w-10 text-[var(--color-text-secondary)]" aria-hidden="true" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                {isDragActive ? 'Drop the file here' : 'Drag & drop product catalog or grab sheet, or click to select'}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Supports PDF, CSV, Excel, or product images
              </p>
            </div>
          )}
        </div>
        {error && (
          <div className="mt-3 p-3 bg-danger-bg border border-danger-border rounded-lg">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Products ({products.length})
          </h3>
          <button
            type="button"
            onClick={addManualProduct}
            className="px-3 py-1.5 text-xs bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-border)] text-[var(--color-text-primary)] rounded-lg transition font-medium"
          >
            + Add Product Manually
          </button>
        </div>

        {products.length > 0 ? (
          <div className="space-y-4">
            {products.map((product, index) => (
              <div key={index} className="border border-[var(--color-bg-border)] rounded-lg p-4 bg-[var(--color-bg-surface)]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-[var(--color-text-secondary)] block mb-1">SKU *</label>
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
                    <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Product name *</label>
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
                    <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Base price *</label>
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
                  <label className="text-xs text-[var(--color-text-secondary)] block mb-2">Sizes available</label>
                  <div className="flex flex-wrap gap-2">
                    {allSizes.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(index, size)}
                        className={`
                          px-3 py-1 text-xs rounded-lg border transition
                          ${product.sizes.includes(size)
                            ? 'bg-[var(--color-red-primary)] border-[var(--color-red-primary)] text-white'
                            : 'border-[var(--color-bg-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
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
                    className="text-xs text-danger hover:text-danger"
                  >
                    Remove product
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-[var(--color-bg-border)] rounded-lg p-8 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              No products added yet. Upload a catalog or add products manually.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-[var(--color-bg-border)]">
        <button
          type="button"
          onClick={onPrev}
          className="px-6 py-2 border border-[var(--color-bg-border)] rounded-lg hover:bg-[var(--color-bg-surface)]/5 transition text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />Previous
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-[var(--color-red-primary)] text-white rounded-lg hover:bg-[var(--color-red-hover)] transition font-semibold"
        >
          Next: Set Initial Stock <ArrowRight className="inline-block h-4 w-4 align-[-0.125em] ml-1" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
