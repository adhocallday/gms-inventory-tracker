'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface Product {
  sku: string;
  name: string;
  sizes: string[];
}

interface InventoryItem {
  sku: string;
  size: string;
  location: string;
  quantity: number;
}

interface InitialInventoryStepProps {
  products: Product[];
  inventory: InventoryItem[];
  onUpdate: (inventory: InventoryItem[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

const LOCATIONS = ['Warehouse', 'Webstore', 'Road', 'Retail'];

export default function InitialInventoryStep({ products, inventory, onUpdate, onNext, onPrev }: InitialInventoryStepProps) {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('products', JSON.stringify(products.map(p => ({ sku: p.sku, sizes: p.sizes }))));

      const response = await fetch('/api/admin/parse-inventory', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse inventory');
      }

      const result = await response.json();
      onUpdate([...inventory, ...result.inventory]);
    } catch (err: any) {
      setError(err.message);
      console.error('Inventory parse error:', err);
    } finally {
      setParsing(false);
    }
  }, [products, inventory, onUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  const addInventoryItem = () => {
    if (products.length === 0) {
      alert('Please add products first');
      return;
    }
    const newItem: InventoryItem = {
      sku: products[0].sku,
      size: products[0].sizes[0] || 'S',
      location: 'Warehouse',
      quantity: 0
    };
    onUpdate([...inventory, newItem]);
  };

  const updateItem = (index: number, field: keyof InventoryItem, value: string | number) => {
    const updated = [...inventory];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
  };

  const removeItem = (index: number) => {
    onUpdate(inventory.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Optional - can skip initial inventory
    onNext();
  };

  // Group inventory by SKU for summary view
  const inventorySummary = products.map(product => {
    const productInventory = inventory.filter(item => item.sku === product.sku);
    const totalQty = productInventory.reduce((sum, item) => sum + item.quantity, 0);
    return {
      sku: product.sku,
      name: product.name,
      totalQuantity: totalQty,
      locations: LOCATIONS.map(loc => ({
        location: loc,
        quantity: productInventory
          .filter(item => item.location === loc)
          .reduce((sum, item) => sum + item.quantity, 0)
      }))
    };
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold g-title mb-4">Initial Inventory (Optional)</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Set starting inventory levels for products you already have in stock from previous tours.
          This step is optional - you can skip it and start with zero inventory.
        </p>
      </div>

      {/* AI Upload Area */}
      <div className="p-6 border border-white/10 rounded-lg bg-[var(--color-bg-elevated)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
          AI-Assisted Upload
        </h3>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
            ${isDragActive ? 'border-[var(--color-red-primary)] bg-[rgba(225,6,20,0.08)]' : 'border-white/15 hover:border-white/30'}
            ${parsing ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          {parsing ? (
            <div className="space-y-2">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-red-primary)] mx-auto"></div>
              <p className="text-sm text-[var(--color-text-secondary)]">Parsing inventory data with AI...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <svg className="mx-auto h-10 w-10 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {isDragActive ? 'Drop the file here' : 'Drag & drop inventory spreadsheet (CSV/Excel), or click to select'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Supports CSV, XLS, XLSX
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

      {/* Summary View */}
      {!showAdvanced && inventorySummary.some(p => p.totalQuantity > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Inventory Summary
            </h3>
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="text-xs text-[var(--color-red-primary)] hover:underline"
            >
              View Details
            </button>
          </div>
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-surface)]/5">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)]">SKU</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)]">Product</th>
                  {LOCATIONS.map(loc => (
                    <th key={loc} className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)]">{loc}</th>
                  ))}
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {inventorySummary.filter(p => p.totalQuantity > 0).map(product => (
                  <tr key={product.sku} className="hover:bg-[var(--color-bg-surface)]/5">
                    <td className="px-4 py-3 text-xs font-mono">{product.sku}</td>
                    <td className="px-4 py-3 text-xs">{product.name}</td>
                    {product.locations.map(loc => (
                      <td key={loc.location} className="px-4 py-3 text-xs text-right text-[var(--color-text-secondary)]">
                        {loc.quantity > 0 ? loc.quantity : '-'}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-xs text-right font-semibold">{product.totalQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Advanced View */}
      {showAdvanced && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Inventory Items ({inventory.length})
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(false)}
                className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                Show Summary
              </button>
              <button
                type="button"
                onClick={addInventoryItem}
                className="px-3 py-1.5 text-xs bg-[var(--color-bg-surface)]/10 hover:bg-[var(--color-bg-surface)]/20 text-white rounded-lg transition font-medium"
              >
                + Add Item
              </button>
            </div>
          </div>

          {inventory.length > 0 ? (
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-bg-surface)]/5">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)]">SKU</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)]">Size</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)]">Location</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)]">Quantity</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {inventory.map((item, index) => (
                      <tr key={index} className="hover:bg-[var(--color-bg-surface)]/5">
                        <td className="px-4 py-2">
                          <select
                            className="g-input text-xs w-full"
                            value={item.sku}
                            onChange={(e) => updateItem(index, 'sku', e.target.value)}
                          >
                            {products.map(p => (
                              <option key={p.sku} value={p.sku}>{p.sku}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            className="g-input text-xs w-full"
                            value={item.size}
                            onChange={(e) => updateItem(index, 'size', e.target.value)}
                          >
                            {products.find(p => p.sku === item.sku)?.sizes.map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            className="g-input text-xs w-full"
                            value={item.location}
                            onChange={(e) => updateItem(index, 'location', e.target.value)}
                          >
                            {LOCATIONS.map(loc => (
                              <option key={loc} value={loc}>{loc}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            className="g-input text-xs w-full"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-white/10 rounded-lg p-8 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                No inventory items added. Click "+ Add Item" or upload a spreadsheet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Skip Option */}
      {inventory.length === 0 && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 You can skip this step if you're starting fresh with no existing inventory.
            You'll be able to add inventory later through purchase orders and receipts.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-white/10">
        <button
          type="button"
          onClick={onPrev}
          className="px-6 py-2 border border-white/10 rounded-lg hover:bg-[var(--color-bg-surface)]/5 transition text-[var(--color-text-primary)]"
        >
          ← Previous
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-[var(--color-red-primary)] text-white rounded-lg hover:bg-[var(--color-red-hover)] transition font-semibold"
        >
          Next: Review & Create →
        </button>
      </div>
    </form>
  );
}
