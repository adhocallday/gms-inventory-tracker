'use client';

import { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from '@/components/layout/NavigationProgress';

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
  const { navigate, isPending } = useNavigate();
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
      navigate(`/tours/${result.tourId}`);
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
        <h2 className="text-xl font-semibold mb-4">Review & create tour</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Review all entered information below. Click "Create tour" to finalize and set up the inventory tracker.
        </p>
      </div>

      {/* Validation Summary */}
      {(validation.missingFields.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-2">
          {validation.missingFields.length > 0 && (
            <div className="p-4 bg-danger-bg border border-danger-border rounded-lg">
              <p className="text-sm font-semibold text-danger mb-1">Missing required fields:</p>
              <ul className="text-sm text-danger list-disc list-inside">
                {validation.missingFields.map((field, i) => (
                  <li key={i}>{field}</li>
                ))}
              </ul>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="p-4 bg-warn-bg border border-warn-border rounded-lg">
              <p className="text-sm font-semibold text-warn mb-1">Warnings:</p>
              <ul className="text-sm text-warn list-disc list-inside">
                {validation.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tour Info Section */}
      <div className="border border-[var(--color-bg-border)] rounded-lg bg-[var(--color-bg-elevated)]">
        <button
          type="button"
          onClick={() => toggleSection('tour')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--color-bg-surface)]/5 transition"
        >
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Tour information</h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              {tourData.name} · {tourData.artist}
            </p>
          </div>
          <span className="text-xl text-[var(--color-text-secondary)]">
            {expandedSections.tour ? '−' : '+'}
          </span>
        </button>
        {expandedSections.tour && (
          <div className="p-4 border-t border-[var(--color-bg-border)] space-y-3">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Tour name</p>
              <p className="text-sm text-[var(--color-text-primary)] font-medium">{tourData.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Artist</p>
              <p className="text-sm text-[var(--color-text-primary)] font-medium">{tourData.artist || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Start date</p>
                <p className="text-sm text-[var(--color-text-primary)] font-medium">
                  {tourData.startDate ? new Date(tourData.startDate).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">End date</p>
                <p className="text-sm text-[var(--color-text-primary)] font-medium">
                  {tourData.endDate ? new Date(tourData.endDate).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
            {tourData.description && (
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Description</p>
                <p className="text-sm text-[var(--color-text-primary)]">{tourData.description}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shows Section */}
      <div className="border border-[var(--color-bg-border)] rounded-lg bg-[var(--color-bg-elevated)]">
        <button
          type="button"
          onClick={() => toggleSection('shows')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--color-bg-surface)]/5 transition"
        >
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Shows</h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              {shows.length} show{shows.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          <span className="text-xl text-[var(--color-text-secondary)]">
            {expandedSections.shows ? '−' : '+'}
          </span>
        </button>
        {expandedSections.shows && (
          <div className="p-4 border-t border-[var(--color-bg-border)]">
            {shows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-bg-surface)]/5">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">Date</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">Venue</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">Location</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">Capacity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-bg-border)]">
                    {shows.map((show, index) => (
                      <tr key={index} className="hover:bg-[var(--color-bg-surface)]/5">
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
              <p className="text-sm text-[var(--color-text-secondary)]">No shows added</p>
            )}
          </div>
        )}
      </div>

      {/* Products Section */}
      <div className="border border-[var(--color-bg-border)] rounded-lg bg-[var(--color-bg-elevated)]">
        <button
          type="button"
          onClick={() => toggleSection('products')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--color-bg-surface)]/5 transition"
        >
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Products</h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              {products.length} product{products.length !== 1 ? 's' : ''} in catalog
            </p>
          </div>
          <span className="text-xl text-[var(--color-text-secondary)]">
            {expandedSections.products ? '−' : '+'}
          </span>
        </button>
        {expandedSections.products && (
          <div className="p-4 border-t border-[var(--color-bg-border)]">
            {products.length > 0 ? (
              <div className="space-y-3">
                {products.map((product, index) => (
                  <div key={index} className="border border-[var(--color-bg-border)] rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{product.name}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                          SKU: {product.sku} · Category: {product.category} · Base Price: ${product.basePrice.toFixed(2)}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {product.sizes.map(size => (
                            <span key={size} className="px-2 py-0.5 text-xs bg-[var(--color-bg-surface)]/10 rounded">
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
              <p className="text-sm text-[var(--color-text-secondary)]">No products added</p>
            )}
          </div>
        )}
      </div>

      {/* Inventory Section */}
      <div className="border border-[var(--color-bg-border)] rounded-lg bg-[var(--color-bg-elevated)]">
        <button
          type="button"
          onClick={() => toggleSection('inventory')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--color-bg-surface)]/5 transition"
        >
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Initial inventory</h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              {totalInventory} total units across {initialInventory.length} line item{initialInventory.length !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="text-xl text-[var(--color-text-secondary)]">
            {expandedSections.inventory ? '−' : '+'}
          </span>
        </button>
        {expandedSections.inventory && (
          <div className="p-4 border-t border-[var(--color-bg-border)]">
            {initialInventory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-bg-surface)]/5">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">SKU</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">Size</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">Location</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-bg-border)]">
                    {initialInventory.map((item, index) => (
                      <tr key={index} className="hover:bg-[var(--color-bg-surface)]/5">
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
              <p className="text-sm text-[var(--color-text-secondary)]">
                No initial inventory set. Starting with zero inventory.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-danger-bg border border-danger-border rounded-lg">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-[var(--color-bg-border)]">
        <button
          type="button"
          onClick={onPrev}
          disabled={submitting}
          className="px-6 py-2 border border-[var(--color-bg-border)] rounded-lg hover:bg-[var(--color-bg-surface)]/5 transition text-[var(--color-text-primary)] disabled:opacity-50"
        >
          <ArrowLeft className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />Previous
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || isPending || validation.missingFields.length > 0}
          aria-busy={submitting || isPending}
          className="inline-flex items-center gap-2 px-6 py-2 bg-[var(--color-red-primary)] text-white rounded-lg hover:bg-[var(--color-red-hover)] transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(submitting || isPending) && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitting ? 'Creating tour…' : isPending ? 'Opening the tour…' : 'Create Tour'}
        </button>
      </div>
    </div>
  );
}
