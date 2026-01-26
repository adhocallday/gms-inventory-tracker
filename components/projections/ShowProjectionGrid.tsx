'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Package, Truck, Gift, ChevronLeft, ChevronRight } from 'lucide-react';

type Show = {
  id: string;
  show_date: string;
  venue_name: string | null;
  city: string | null;
  attendance: number | null;
  projections: ShowProjection[];
  deliveries: ShowDelivery[];
  comps: ShowComp[];
};

type ShowProjection = {
  id: string;
  sku: string;
  size: string | null;
  projected_units: number;
  notes: string | null;
};

type ShowDelivery = {
  id: string;
  sku: string;
  size: string | null;
  quantity: number;
  delivery_type: 'delivery' | 'return' | 'adjustment';
  notes: string | null;
};

type ShowComp = {
  id: string;
  sku: string;
  size: string | null;
  comp_type: 'band' | 'gms' | 'show' | 'trailer' | 'other';
  quantity: number;
  notes: string | null;
};

type InitialInventory = {
  sku: string;
  size: string | null;
  quantity: number;
};

type Product = {
  sku: string;
  description: string;
  sizes: string[];
};

type ReorderThreshold = {
  sku: string;
  size: string | null;
  minimum_balance: number;
};

interface ShowProjectionGridProps {
  tourId: string;
  scenarioId: string;
  products: Product[];
  onDeliveryClick?: (showId: string, sku: string, size: string | null) => void;
  onCompClick?: (showId: string, sku: string, size: string | null) => void;
}

const sizeOrder = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function ShowProjectionGrid({
  tourId,
  scenarioId,
  products,
  onDeliveryClick,
  onCompClick,
}: ShowProjectionGridProps) {
  const [shows, setShows] = useState<Show[]>([]);
  const [initialInventory, setInitialInventory] = useState<InitialInventory[]>([]);
  const [thresholds, setThresholds] = useState<ReorderThreshold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Number of shows to display at once (for horizontal scrolling)
  const VISIBLE_SHOWS = 10;

  // Load show data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Load shows with projections
        const showsRes = await fetch(
          `/api/tours/${tourId}/projections/shows?scenario_id=${scenarioId}`
        );
        if (showsRes.ok) {
          const data = await showsRes.json();
          setShows(data.shows || []);
          setInitialInventory(data.initialInventory || []);
        }

        // Load thresholds
        const thresholdsRes = await fetch(`/api/tours/${tourId}/reorder-thresholds`);
        if (thresholdsRes.ok) {
          const data = await thresholdsRes.json();
          setThresholds(data.thresholds || []);
        }
      } catch (error) {
        console.error('Failed to load show projections:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (tourId && scenarioId) {
      loadData();
    }
  }, [tourId, scenarioId]);

  // Create product rows (one per SKU/size combination)
  const productRows = useMemo(() => {
    const rows: Array<{
      sku: string;
      size: string | null;
      description: string;
      key: string;
    }> = [];

    products.forEach((product) => {
      if (product.sizes.length === 0) {
        rows.push({
          sku: product.sku,
          size: null,
          description: product.description,
          key: `${product.sku}:`,
        });
      } else {
        product.sizes.forEach((size) => {
          rows.push({
            sku: product.sku,
            size,
            description: product.description,
            key: `${product.sku}:${size}`,
          });
        });
      }
    });

    return rows;
  }, [products]);

  // Calculate running balance for each product/size across shows
  const runningBalances = useMemo(() => {
    const balances = new Map<string, Map<string, number>>();

    productRows.forEach((row) => {
      const productBalances = new Map<string, number>();
      const initial = initialInventory.find(
        (i) => i.sku === row.sku && (i.size === row.size || (!i.size && !row.size))
      );
      let runningBalance = initial?.quantity || 0;

      shows.forEach((show) => {
        const projection = show.projections.find(
          (p) => p.sku === row.sku && (p.size === row.size || (!p.size && !row.size))
        );
        const deliveryTotal = show.deliveries
          .filter((d) => d.sku === row.sku && (d.size === row.size || (!d.size && !row.size)))
          .reduce((sum, d) => {
            if (d.delivery_type === 'return') return sum - d.quantity;
            return sum + d.quantity;
          }, 0);
        const compTotal = show.comps
          .filter((c) => c.sku === row.sku && (c.size === row.size || (!c.size && !row.size)))
          .reduce((sum, c) => sum + c.quantity, 0);

        runningBalance += deliveryTotal - (projection?.projected_units || 0) - compTotal;
        productBalances.set(show.id, runningBalance);
      });

      balances.set(row.key, productBalances);
    });

    return balances;
  }, [productRows, shows, initialInventory]);

  // Get threshold for a product
  const getThreshold = useCallback(
    (sku: string, size: string | null) => {
      return thresholds.find(
        (t) => t.sku === sku && (t.size === size || t.size === null)
      );
    },
    [thresholds]
  );

  // Check if balance is below threshold
  const isBelowThreshold = useCallback(
    (sku: string, size: string | null, balance: number) => {
      const threshold = getThreshold(sku, size);
      return threshold && balance < threshold.minimum_balance;
    },
    [getThreshold]
  );

  // Handle cell edit
  const handleCellClick = useCallback((showId: string, sku: string, size: string | null, currentValue: number) => {
    const key = `${showId}:${sku}:${size ?? ''}`;
    setEditingCell(key);
    setEditValue(String(currentValue));
  }, []);

  const handleCellBlur = useCallback(async () => {
    if (!editingCell) return;

    const [showId, sku, size] = editingCell.split(':');
    const newValue = parseInt(editValue, 10) || 0;

    setIsSaving(true);
    try {
      await fetch(`/api/tours/${tourId}/projections/shows/${showId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: scenarioId,
          projections: [
            {
              sku,
              size: size || null,
              projected_units: newValue,
            },
          ],
        }),
      });

      // Update local state
      setShows((prev) =>
        prev.map((show) => {
          if (show.id !== showId) return show;
          const existingIdx = show.projections.findIndex(
            (p) => p.sku === sku && (p.size === (size || null) || (!p.size && !size))
          );
          if (existingIdx >= 0) {
            const newProjections = [...show.projections];
            newProjections[existingIdx] = {
              ...newProjections[existingIdx],
              projected_units: newValue,
            };
            return { ...show, projections: newProjections };
          }
          return {
            ...show,
            projections: [
              ...show.projections,
              {
                id: 'temp',
                sku,
                size: size || null,
                projected_units: newValue,
                notes: null,
              },
            ],
          };
        })
      );
    } catch (error) {
      console.error('Failed to save projection:', error);
    } finally {
      setIsSaving(false);
      setEditingCell(null);
    }
  }, [editingCell, editValue, tourId, scenarioId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleCellBlur();
      } else if (e.key === 'Escape') {
        setEditingCell(null);
      }
    },
    [handleCellBlur]
  );

  // Visible shows slice
  const visibleShows = useMemo(() => {
    return shows.slice(visibleStartIndex, visibleStartIndex + VISIBLE_SHOWS);
  }, [shows, visibleStartIndex]);

  const canScrollLeft = visibleStartIndex > 0;
  const canScrollRight = visibleStartIndex + VISIBLE_SHOWS < shows.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-[var(--g-text-muted)]">Loading show projections...</div>
      </div>
    );
  }

  if (shows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="w-10 h-10 text-[var(--g-text-muted)] mb-3" />
        <p className="text-sm text-[var(--g-text-muted)]">No shows found for this tour</p>
        <p className="text-xs text-[var(--g-text-muted)] mt-1">
          Add shows to start creating projections
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[var(--g-text-muted)]">
          Showing shows {visibleStartIndex + 1}-
          {Math.min(visibleStartIndex + VISIBLE_SHOWS, shows.length)} of {shows.length}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setVisibleStartIndex((prev) => Math.max(0, prev - VISIBLE_SHOWS))}
            disabled={!canScrollLeft}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              setVisibleStartIndex((prev) =>
                Math.min(shows.length - VISIBLE_SHOWS, prev + VISIBLE_SHOWS)
              )
            }
            disabled={!canScrollRight}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              {/* Frozen columns */}
              <th className="sticky left-0 z-20 bg-white py-2 px-3 text-left font-medium min-w-[120px]">
                SKU
              </th>
              <th className="sticky left-[120px] z-20 bg-white py-2 px-3 text-left font-medium min-w-[60px]">
                Size
              </th>
              <th className="sticky left-[180px] z-20 bg-white py-2 px-3 text-right font-medium min-w-[80px] border-r border-slate-300">
                Initial
              </th>
              {/* Show columns */}
              {visibleShows.map((show, idx) => (
                <th
                  key={show.id}
                  className={`py-2 px-2 text-center font-medium min-w-[100px] ${
                    idx < visibleShows.length - 1 ? 'border-r border-slate-100' : ''
                  }`}
                >
                  <div className="text-xs font-semibold">{formatDate(show.show_date)}</div>
                  <div className="text-[10px] text-[var(--g-text-muted)] truncate max-w-[90px]">
                    {show.city || show.venue_name || 'TBD'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {productRows.map((row, rowIdx) => {
              const initialQty =
                initialInventory.find(
                  (i) => i.sku === row.sku && (i.size === row.size || (!i.size && !row.size))
                )?.quantity || 0;
              const productBalances = runningBalances.get(row.key);

              // Check if this is the first size of a new SKU
              const isFirstOfSku =
                rowIdx === 0 || productRows[rowIdx - 1].sku !== row.sku;

              return (
                <tr
                  key={row.key}
                  className={`border-b border-slate-100 hover:bg-slate-50 ${
                    isFirstOfSku ? 'border-t border-slate-200' : ''
                  }`}
                >
                  {/* Frozen columns */}
                  <td className="sticky left-0 z-10 bg-white py-2 px-3">
                    {isFirstOfSku ? (
                      <div>
                        <div className="font-mono text-xs font-medium">{row.sku}</div>
                        <div className="text-[10px] text-[var(--g-text-muted)] truncate max-w-[110px]">
                          {row.description}
                        </div>
                      </div>
                    ) : null}
                  </td>
                  <td className="sticky left-[120px] z-10 bg-white py-2 px-3 text-xs">
                    {row.size || 'OS'}
                  </td>
                  <td className="sticky left-[180px] z-10 bg-white py-2 px-3 text-right font-mono text-xs border-r border-slate-300">
                    {initialQty}
                  </td>

                  {/* Show cells */}
                  {visibleShows.map((show, idx) => {
                    const projection = show.projections.find(
                      (p) =>
                        p.sku === row.sku && (p.size === row.size || (!p.size && !row.size))
                    );
                    const projectedUnits = projection?.projected_units || 0;
                    const deliveryTotal = show.deliveries
                      .filter(
                        (d) =>
                          d.sku === row.sku && (d.size === row.size || (!d.size && !row.size))
                      )
                      .reduce((sum, d) => {
                        if (d.delivery_type === 'return') return sum - d.quantity;
                        return sum + d.quantity;
                      }, 0);
                    const compTotal = show.comps
                      .filter(
                        (c) =>
                          c.sku === row.sku && (c.size === row.size || (!c.size && !row.size))
                      )
                      .reduce((sum, c) => sum + c.quantity, 0);
                    const balance = productBalances?.get(show.id) || 0;
                    const belowThreshold = isBelowThreshold(row.sku, row.size, balance);
                    const cellKey = `${show.id}:${row.sku}:${row.size ?? ''}`;
                    const isEditing = editingCell === cellKey;

                    return (
                      <td
                        key={show.id}
                        className={`py-1 px-1 ${
                          idx < visibleShows.length - 1 ? 'border-r border-slate-100' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          {/* Projected sales (editable) */}
                          <div className="flex items-center justify-center">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleCellBlur}
                                onKeyDown={handleKeyDown}
                                className="w-14 px-1 py-0.5 text-center text-xs border border-[var(--g-accent)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--g-accent)]"
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() =>
                                  handleCellClick(show.id, row.sku, row.size, projectedUnits)
                                }
                                className="w-14 px-1 py-0.5 text-center text-xs font-mono hover:bg-slate-100 rounded cursor-text"
                                disabled={isSaving}
                              >
                                {projectedUnits || '-'}
                              </button>
                            )}
                          </div>

                          {/* Delivery indicator */}
                          {deliveryTotal !== 0 && (
                            <button
                              onClick={() => onDeliveryClick?.(show.id, row.sku, row.size)}
                              className="flex items-center justify-center gap-0.5 text-[10px] text-green-600 hover:bg-green-50 rounded px-1"
                            >
                              <Truck className="w-3 h-3" />
                              <span>{deliveryTotal > 0 ? '+' : ''}{deliveryTotal}</span>
                            </button>
                          )}

                          {/* Comp indicator */}
                          {compTotal > 0 && (
                            <button
                              onClick={() => onCompClick?.(show.id, row.sku, row.size)}
                              className="flex items-center justify-center gap-0.5 text-[10px] text-purple-600 hover:bg-purple-50 rounded px-1"
                            >
                              <Gift className="w-3 h-3" />
                              <span>-{compTotal}</span>
                            </button>
                          )}

                          {/* Running balance */}
                          <div
                            className={`text-[10px] text-center font-medium ${
                              belowThreshold
                                ? 'text-red-600 bg-red-50 rounded'
                                : balance < 0
                                  ? 'text-orange-600'
                                  : 'text-[var(--g-text-muted)]'
                            }`}
                          >
                            {belowThreshold && (
                              <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
                            )}
                            Bal: {balance}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-[var(--g-text-muted)]">
        <div className="flex items-center gap-1">
          <Truck className="w-3 h-3 text-green-600" />
          <span>Delivery</span>
        </div>
        <div className="flex items-center gap-1">
          <Gift className="w-3 h-3 text-purple-600" />
          <span>Comp</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-red-600" />
          <span>Below threshold</span>
        </div>
      </div>
    </div>
  );
}
