'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TourData {
  name: string;
  artist: string;
  startDate: string;
  endDate: string;
  description?: string;
}

interface Show {
  showDate: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  capacity?: number;
}

interface Product {
  sku: string;
  name: string;
  category: string;
  basePrice: number;
  sizes: string[];
  imageUrl?: string;
}

interface InventoryItem {
  sku: string;
  size: string;
  location: string;
  quantity: number;
}

interface ReviewStepProps {
  tourData: TourData;
  shows: Show[];
  products: Product[];
  initialInventory: InventoryItem[];
  onPrev: () => void;
}

export default function ReviewStep({ tourData, shows, products, initialInventory, onPrev }: ReviewStepProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    tour: true,
    shows: false,
    products: false,
    inventory: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Validation
  const validation = {
    missingFields: [] as string[],
    warnings: [] as string[]
  };

  if (!tourData.name) validation.missingFields.push('Tour name');
  if (!tourData.artist) validation.missingFields.push('Artist');
  if (!tourData.startDate) validation.missingFields.push('Start date');
  if (!tourData.endDate) validation.missingFields.push('End date');
  if (shows.length === 0) validation.warnings.push('No shows added');
  if (products.length === 0) validation.warnings.push('No products added');
  if (initialInventory.length === 0) validation.warnings.push('No initial inventory set (starting from zero)');

  const totalInventory = initialInventory.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = async () => {
    if (validation.missingFields.length > 0) {
      setError('Please fill in all required fields before creating the tour.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/create-tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourData,
          shows,
          products,
          initialInventory
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create tour');
      }

      const result = await response.json();

      // Redirect to the new tour page
      router.push(`/tours/${result.tourId}`);
    } catch (err: any) {
      setError(err.message);
      console.error('Tour creation error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold g-title mb-4">Review & Create Tour</h2>
        <p className="text-sm text-[var(--g-text-dim)]">
          Review all entered information below. Click "Create Tour" to finalize and set up the inventory tracker.
        </p>
      </div>

      {/* Validation Summary */}
      {(validation.missingFields.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-2">
          {validation.missingFields.length > 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm font-semibold text-red-400 mb-1">Missing Required Fields:</p>
              <ul className="text-sm text-red-400 list-disc list-inside">
                {validation.missingFields.map((field, i) => (
                  <li key={i}>{field}</li>
                ))}
              </ul>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm font-semibold text-yellow-400 mb-1">Warnings:</p>
              <ul className="text-sm text-yellow-400 list-disc list-inside">
                {validation.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tour Info Section */}
      <div className="border border-white/10 rounded-lg bg-[var(--g-surface-2)]">
        <button
          type="button"
          onClick={() => toggleSection('tour')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition"
        >
          <div>
            <h3 className="text-sm font-semibold text-[var(--g-text)]">Tour Information</h3>
            <p className="text-xs text-[var(--g-text-muted)] mt-1">
              {tourData.name} · {tourData.artist}
            </p>
          </div>
          <span className="text-xl text-[var(--g-text-muted)]">
            {expandedSections.tour ? '−' : '+'}
          </span>
        </button>
        {expandedSections.tour && (
          <div className="p-4 border-t border-white/10 space-y-3">
            <div>
              <p className="text-xs text-[var(--g-text-muted)]">Tour Name</p>
              <p className="text-sm text-[var(--g-text)] font-medium">{tourData.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--g-text-muted)]">Artist</p>
              <p className="text-sm text-[var(--g-text)] font-medium">{tourData.artist || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-[var(--g-text-muted)]">Start Date</p>
                <p className="text-sm text-[var(--g-text)] font-medium">
                  {tourData.startDate ? new Date(tourData.startDate).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--g-text-muted)]">End Date</p>
                <p className="text-sm text-[var(--g-text)] font-medium">
                  {tourData.endDate ? new Date(tourData.endDate).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
            {tourData.description && (
              <div>
                <p className="text-xs text-[var(--g-text-muted)]">Description</p>
                <p className="text-sm text-[var(--g-text)]">{tourData.description}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shows Section */}
      <div className="border border-white/10 rounded-lg bg-[var(--g-surface-2)]">
        <button
          type="button"
          onClick={() => toggleSection('shows')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition"
        >
          <div>
            <h3 className="text-sm font-semibold text-[var(--g-text)]">Shows</h3>
            <p className="text-xs text-[var(--g-text-muted)] mt-1">
              {shows.length} show{shows.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          <span className="text-xl text-[var(--g-text-muted)]">
            {expandedSections.shows ? '−' : '+'}
          </span>
        </button>
        {expandedSections.shows && (
          <div className="p-4 border-t border-white/10">
            {shows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--g-text-muted)]">Date</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--g-text-muted)]">Venue</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--g-text-muted)]">Location</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-[var(--g-text-muted)]">Capacity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {shows.map((show, index) => (
                      <tr key={index} className="hover:bg-white/5">
                        <td className="px-3 py-2 text-xs">
                          {new Date(show.showDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-xs">{show.venueName}</td>
                        <td className="px-3 py-2 text-xs">
                          {show.city}, {show.state}, {show.country}
                        </td>
                        <td className="px-3 py-2 text-xs text-right">
                          {show.capacity ? show.capacity.toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[var(--g-text-muted)]">No shows added</p>
            )}
          </div>
        )}
      </div>

      {/* Products Section */}
      <div className="border border-white/10 rounded-lg bg-[var(--g-surface-2)]">
        <button
          type="button"
          onClick={() => toggleSection('products')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition"
        >
          <div>
            <h3 className="text-sm font-semibold text-[var(--g-text)]">Products</h3>
            <p className="text-xs text-[var(--g-text-muted)] mt-1">
              {products.length} product{products.length !== 1 ? 's' : ''} in catalog
            </p>
          </div>
          <span className="text-xl text-[var(--g-text-muted)]">
            {expandedSections.products ? '−' : '+'}
          </span>
        </button>
        {expandedSections.products && (
          <div className="p-4 border-t border-white/10">
            {products.length > 0 ? (
              <div className="space-y-3">
                {products.map((product, index) => (
                  <div key={index} className="border border-white/10 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--g-text)]">{product.name}</p>
                        <p className="text-xs text-[var(--g-text-muted)] mt-1">
                          SKU: {product.sku} · Category: {product.category} · Base Price: ${product.basePrice.toFixed(2)}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {product.sizes.map(size => (
                            <span key={size} className="px-2 py-0.5 text-xs bg-white/10 rounded">
                              {size}
                            </span>
                          ))}
                        </div>
                      </div>
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded ml-3"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--g-text-muted)]">No products added</p>
            )}
          </div>
        )}
      </div>

      {/* Inventory Section */}
      <div className="border border-white/10 rounded-lg bg-[var(--g-surface-2)]">
        <button
          type="button"
          onClick={() => toggleSection('inventory')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition"
        >
          <div>
            <h3 className="text-sm font-semibold text-[var(--g-text)]">Initial Inventory</h3>
            <p className="text-xs text-[var(--g-text-muted)] mt-1">
              {totalInventory} total units across {initialInventory.length} line item{initialInventory.length !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="text-xl text-[var(--g-text-muted)]">
            {expandedSections.inventory ? '−' : '+'}
          </span>
        </button>
        {expandedSections.inventory && (
          <div className="p-4 border-t border-white/10">
            {initialInventory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--g-text-muted)]">SKU</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--g-text-muted)]">Size</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--g-text-muted)]">Location</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-[var(--g-text-muted)]">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {initialInventory.map((item, index) => (
                      <tr key={index} className="hover:bg-white/5">
                        <td className="px-3 py-2 text-xs font-mono">{item.sku}</td>
                        <td className="px-3 py-2 text-xs">{item.size}</td>
                        <td className="px-3 py-2 text-xs">{item.location}</td>
                        <td className="px-3 py-2 text-xs text-right font-semibold">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[var(--g-text-muted)]">
                No initial inventory set. Starting with zero inventory.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-white/10">
        <button
          type="button"
          onClick={onPrev}
          disabled={submitting}
          className="px-6 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition text-[var(--g-text)] disabled:opacity-50"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || validation.missingFields.length > 0}
          className="px-6 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating Tour...' : 'Create Tour'}
        </button>
      </div>
    </div>
  );
}
