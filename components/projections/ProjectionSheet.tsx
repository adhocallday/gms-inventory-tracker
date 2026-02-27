'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, Calendar, Copy, Maximize2, Minimize2, X } from 'lucide-react';
import { EnhancedAIAgentPanel } from './AIAgentPanel';
import { ProjectionVisualizations } from './ProjectionVisualizations';
import { ShowProjectionGrid } from './ShowProjectionGrid';
import { ReorderAlertBanner } from './ReorderAlertBanner';
import { DeliveryEditor } from './DeliveryEditor';
import { CompBreakdownPanel } from './CompBreakdownPanel';
import { CopyFromTourModal } from './CopyFromTourModal';

type ViewMode = 'aggregate' | 'by-show';

type Scenario = {
  id: string;
  name: string;
  is_baseline: boolean | null;
};

type ProductRow = {
  id: string;
  sku: string;
  description: string;
};

type TourProductRow = {
  product_id: string;
  size: string | null;
  full_package_cost: number | null;
  suggested_retail: number | null;
};

type ProductSummaryRow = {
  product_id: string;
  sku: string;
  description: string;
  size: string | null;
  total_sold: number | null;
  total_gross: number | null;
  full_package_cost: number | null;
};

type ShowSummaryRow = {
  show_id: string;
  total_gross: number | null;
  attendance: number | null;
  per_head: number | null;
};

type InventoryBalanceRow = {
  product_id: string;
  size: string | null;
  balance: number | null;
};

type PoOpenRow = {
  product_id: string;
  size: string | null;
  open_quantity: number | null;
  sku: string;
};

type ForecastOverrideRow = {
  sku: string;
  size: string | null;
  bucket: string | null;
  override_units: number | null;
};

const sizeOrder = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
// Note: warehouse locations will be loaded dynamically per tour

const defaultSizeCurve: Record<string, number> = {
  S: 0.12,
  M: 0.26,
  L: 0.28,
  XL: 0.2,
  '2XL': 0.09,
  '3XL': 0.05
};

function numberOrZero(value?: number | null) {
  return value ? Number(value) : 0;
}

export function ProjectionSheet({
  tourId,
  scenarios,
  products,
  tourProducts,
  productSummary,
  showSummary,
  inventoryBalances,
  poOpenQuantities
}: {
  tourId: string;
  scenarios: Scenario[];
  products: ProductRow[];
  tourProducts: TourProductRow[];
  productSummary: ProductSummaryRow[];
  showSummary: ShowSummaryRow[];
  inventoryBalances: InventoryBalanceRow[];
  poOpenQuantities: PoOpenRow[];
}) {
  const [scenarioList, setScenarioList] = useState<Scenario[]>(scenarios);
  const baselineScenario = scenarioList.find((scenario) => scenario.is_baseline);
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    baselineScenario?.id ?? scenarioList[0]?.id ?? ''
  );
  const [overrideMap, setOverrideMap] = useState<Record<string, string>>({});
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [expectedAttendance, setExpectedAttendance] = useState(() =>
    showSummary.reduce((sum, row) => sum + numberOrZero(row.attendance), 0)
  );
  const [expectedPerHead, setExpectedPerHead] = useState(() => {
    const totalGross = showSummary.reduce(
      (sum, row) => sum + numberOrZero(row.total_gross),
      0
    );
    const totalAttendance = showSummary.reduce(
      (sum, row) => sum + numberOrZero(row.attendance),
      0
    );
    return totalAttendance ? totalGross / totalAttendance : 0;
  });
  const [aiGenerated, setAiGenerated] = useState(false);
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [warehouseLocations, setWarehouseLocations] = useState<Array<{
    id: string;
    name: string;
    location_type: string;
    display_order: number;
  }>>([]);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('aggregate');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [deliveryModal, setDeliveryModal] = useState<{
    showId: string;
    showInfo: { date: string; venue: string; city: string };
    sku: string;
    size: string | null;
  } | null>(null);
  const [compModal, setCompModal] = useState<{
    showId: string;
    showInfo: { date: string; venue: string; city: string };
    sku: string;
    size: string | null;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch warehouse locations for this tour
  useEffect(() => {
    async function loadWarehouseLocations() {
      try {
        const response = await fetch(`/api/tours/${tourId}/warehouse-locations`);
        if (response.ok) {
          const data = await response.json();
          setWarehouseLocations(data.locations || []);
          setLocationsLoaded(true);
          console.log('📍 Loaded warehouse locations for tour:', data.locations);
        }
      } catch (error) {
        console.error('Failed to load warehouse locations:', error);
        setLocationsLoaded(true);
      }
    }
    loadWarehouseLocations();
  }, [tourId]);

  useEffect(() => {
    if (scenarioList.length > 0 || isCreating) return;
    setIsCreating(true);
    fetch('/api/forecast-scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tourId, name: 'Baseline', isBaseline: true })
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.scenario) return;
        setScenarioList((prev) => [...prev, data.scenario]);
        setSelectedScenarioId(data.scenario.id);
      })
      .finally(() => setIsCreating(false));
  }, [scenarioList.length, isCreating, tourId]);

  useEffect(() => {
    if (!selectedScenarioId) return;
    setIsLoadingOverrides(true);
    fetch(`/api/forecast-overrides?scenarioId=${selectedScenarioId}&tourId=${tourId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const nextMap: Record<string, string> = {};
        (data?.overrides as ForecastOverrideRow[] | undefined)?.forEach((row) => {
          const key = `${row.sku}::${row.size ?? ''}::${row.bucket ?? ''}`;
          nextMap[key] = String(row.override_units ?? 0);
        });
        setOverrideMap(nextMap);
      })
      .finally(() => setIsLoadingOverrides(false));
  }, [selectedScenarioId, tourId]);

  const productIdToSku = useMemo(() => {
    const map = new Map<string, ProductRow>();
    products.forEach((product) => map.set(product.id, product));
    return map;
  }, [products]);

  const sizeMap = useMemo(() => {
    const map = new Map<string, string[]>();
    tourProducts.forEach((row) => {
      const sku = productIdToSku.get(row.product_id)?.sku;
      if (!sku || !row.size) return;
      if (!map.has(sku)) map.set(sku, []);
      const list = map.get(sku) ?? [];
      if (!list.includes(row.size)) list.push(row.size);
    });
    map.forEach((list, sku) => {
      list.sort((a, b) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b));
      map.set(sku, list);
    });
    return map;
  }, [tourProducts, productIdToSku]);

  const costMap = useMemo(() => {
    const map = new Map<string, number>();
    tourProducts.forEach((row) => {
      if (row.full_package_cost === null) return;
      const sku = productIdToSku.get(row.product_id)?.sku;
      if (!sku) return;
      map.set(`${sku}:${row.size ?? ''}`, Number(row.full_package_cost));
    });
    return map;
  }, [tourProducts, productIdToSku]);

  const retailMap = useMemo(() => {
    const map = new Map<string, number>();
    tourProducts.forEach((row) => {
      if (row.suggested_retail === null) return;
      const sku = productIdToSku.get(row.product_id)?.sku;
      if (!sku) return;
      map.set(`${sku}:${row.size ?? ''}`, Number(row.suggested_retail));
      if (!map.has(`${sku}:`)) {
        map.set(`${sku}:`, Number(row.suggested_retail));
      }
    });
    return map;
  }, [tourProducts, productIdToSku]);

  const inventoryMap = useMemo(() => {
    const map = new Map<string, number>();
    inventoryBalances.forEach((row) => {
      const sku = productIdToSku.get(row.product_id)?.sku;
      if (!sku) return;
      map.set(`${sku}:${row.size ?? ''}`, numberOrZero(row.balance));
    });
    return map;
  }, [inventoryBalances, productIdToSku]);

  const onHandBySku = useMemo(() => {
    const map = new Map<string, number>();
    inventoryMap.forEach((value, key) => {
      const [sku] = key.split(':');
      map.set(sku, (map.get(sku) ?? 0) + value);
    });
    return map;
  }, [inventoryMap]);

  const onOrderBySku = useMemo(() => {
    const map = new Map<string, number>();
    poOpenQuantities.forEach((row) => {
      map.set(row.sku, (map.get(row.sku) ?? 0) + numberOrZero(row.open_quantity));
    });
    return map;
  }, [poOpenQuantities]);

  const shareBySku = useMemo(() => {
    const totalGross = productSummary.reduce(
      (sum, row) => sum + numberOrZero(row.total_gross),
      0
    );
    const map = new Map<string, number>();
    productSummary.forEach((row) => {
      map.set(row.sku, numberOrZero(row.total_gross) / (totalGross || 1));
    });
    return map;
  }, [productSummary]);

  const sizeCurveBySku = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    const totals = new Map<string, number>();
    productSummary.forEach((row) => {
      if (!row.size) return;
      totals.set(row.sku, (totals.get(row.sku) ?? 0) + numberOrZero(row.total_sold));
    });
    productSummary.forEach((row) => {
      if (!row.size) return;
      const total = totals.get(row.sku) ?? 0;
      const ratio = total ? numberOrZero(row.total_sold) / total : 0;
      if (!map.has(row.sku)) map.set(row.sku, {});
      map.get(row.sku)![row.size] = ratio;
    });
    return map;
  }, [productSummary]);

  const rows = useMemo(() => {
    return products.map((product) => {
      const sku = product.sku;
      const sizes = sizeMap.get(sku) ?? sizeOrder;
      const priceOverride = overrideMap[`${sku}::PRICE::`];
      const basePrice =
        Number(priceOverride ?? retailMap.get(`${sku}:`) ?? 0) ||
        Number(retailMap.get(`${sku}:`) ?? 0);

      const expectedGross = expectedAttendance * expectedPerHead;
      const productShare = shareBySku.get(sku) ?? 0;
      const expectedProductGross = expectedGross * productShare;
      const baselineUnits = basePrice ? expectedProductGross / basePrice : 0;

      const totalOverride = overrideMap[`${sku}::::`];
      const forecastUnits = totalOverride ? Number(totalOverride) : baselineUnits;

      const sizeCurve = sizeCurveBySku.get(sku) ?? defaultSizeCurve;
      const sizeBreakdown: Record<string, number> = {};
      sizes.forEach((size) => {
        const override = overrideMap[`${sku}::${size}::`];
        if (override !== undefined) {
          sizeBreakdown[size] = Number(override);
        } else {
          sizeBreakdown[size] = Math.round(forecastUnits * (sizeCurve[size] ?? 0));
        }
      });

      const warehouseAllocations: Record<string, number> = {};
      warehouseLocations.forEach((location) => {
        const override = overrideMap[`${sku}::::${location.id}`];
        warehouseAllocations[location.id] = override ? Number(override) : 0;
      });

      const onHand = onHandBySku.get(sku) ?? 0;
      const onOrder = onOrderBySku.get(sku) ?? 0;
      const unitCost = Number(costMap.get(`${sku}:`) ?? 0);
      const forecastGross = forecastUnits * basePrice;
      const forecastCogs = forecastUnits * unitCost;
      const forecastMargin = forecastGross - forecastCogs;

      return {
        sku,
        description: product.description,
        price: basePrice,
        share: productShare,
        forecastUnits,
        sizeBreakdown,
        warehouseAllocations,
        onHand,
        onOrder,
        unitCost,
        forecastGross,
        forecastCogs,
        forecastMargin,
        sizes
      };
    });
  }, [
    products,
    sizeMap,
    overrideMap,
    retailMap,
    expectedAttendance,
    expectedPerHead,
    shareBySku,
    sizeCurveBySku,
    onHandBySku,
    onOrderBySku,
    costMap
  ]);

  const totals = rows.reduce(
    (acc, row) => {
      acc.units += row.forecastUnits;
      acc.gross += row.forecastGross;
      acc.cogs += row.forecastCogs;
      acc.margin += row.forecastMargin;
      return acc;
    },
    { units: 0, gross: 0, cogs: 0, margin: 0 }
  );

  function updateOverride(sku: string, size: string | null, bucket: string | null, value: string) {
    const key = `${sku}::${size ?? ''}::${bucket ?? ''}`;
    setOverrideMap((prev) => ({ ...prev, [key]: value }));
  }

  async function saveOverride(
    sku: string,
    size: string | null,
    bucket: string | null,
    value: string
  ) {
    if (!selectedScenarioId) return;
    const overrideUnits = Number(value);
    await fetch('/api/forecast-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario_id: selectedScenarioId,
        tour_id: tourId,
        sku,
        size,
        bucket,
        override_units: Number.isFinite(overrideUnits) ? overrideUnits : 0
      })
    });
  }

  async function createScenario() {
    const name = window.prompt('Scenario name');
    if (!name) return;
    const response = await fetch('/api/forecast-scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tourId, name })
    });
    if (!response.ok) return;
    const data = await response.json();
    setScenarioList((prev) => [...prev, data.scenario]);
    setSelectedScenarioId(data.scenario.id);
  }

  async function duplicateScenario() {
    if (!selectedScenarioId) return;
    const response = await fetch(`/api/forecast-scenarios/${selectedScenarioId}/duplicate`, {
      method: 'POST'
    });
    if (!response.ok) return;
    const data = await response.json();
    setScenarioList((prev) => [...prev, data.scenario]);
    setSelectedScenarioId(data.scenario.id);
  }

  async function setBaseline() {
    if (!selectedScenarioId) return;
    const response = await fetch(`/api/forecast-scenarios/${selectedScenarioId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_baseline: true })
    });
    if (!response.ok) return;
    setScenarioList((prev) =>
      prev.map((scenario) => ({
        ...scenario,
        is_baseline: scenario.id === selectedScenarioId
      }))
    );
  }

  async function deleteScenario() {
    if (!selectedScenarioId) return;
    if (!window.confirm('Delete this scenario?')) return;
    const response = await fetch(`/api/forecast-scenarios/${selectedScenarioId}`, {
      method: 'DELETE'
    });
    if (!response.ok) return;
    setScenarioList((prev) => {
      const remaining = prev.filter((scenario) => scenario.id !== selectedScenarioId);
      setSelectedScenarioId(remaining[0]?.id ?? '');
      return remaining;
    });
  }

  function exportCsv() {
    const header = [
      'SKU',
      'Description',
      'Price',
      'Forecast Units',
      ...sizeOrder,
      ...warehouseLocations.map(loc => loc.name),
      'On Hand',
      'On Order',
      'Forecast Gross',
      'Forecast COGS',
      'Forecast Margin'
    ];
    const lines = [header.join(',')];
    rows.forEach((row) => {
      const sizes = sizeOrder.map((size) => row.sizeBreakdown[size] ?? 0);
      const warehouseValues = warehouseLocations.map((loc) => row.warehouseAllocations[loc.id] ?? 0);
      lines.push(
        [
          row.sku,
          `"${row.description.replace(/"/g, '""')}"`,
          row.price.toFixed(2),
          row.forecastUnits.toFixed(0),
          ...sizes.map((value: number) => value.toFixed(0)),
          ...warehouseValues.map((value: number) => value.toFixed(0)),
          row.onHand.toFixed(0),
          row.onOrder.toFixed(0),
          row.forecastGross.toFixed(2),
          row.forecastCogs.toFixed(2),
          row.forecastMargin.toFixed(2)
        ].join(',')
      );
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `projection-${tourId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function applyAllRecommendations(projections: any[]) {
    console.log('🚀 Applying recommendations for', projections.length, 'products');
    console.log('First projection:', projections[0]);

    setIsLoadingOverrides(true);

    // Build all overrides in a single array for bulk upsert
    const allOverrides: Array<{
      sku: string;
      size?: string | null;
      bucket?: string | null;
      override_units: number;
    }> = [];

    for (const proj of projections) {
      console.log(`📦 Processing ${proj.sku}:`, {
        price: proj.retailPrice,
        units: proj.baselineUnits,
        sizes: Object.keys(proj.sizeBreakdown || {}),
        warehouses: Object.keys(proj.warehouseAllocations || {})
      });

      // Add price override
      allOverrides.push({
        sku: proj.sku,
        size: 'PRICE',
        bucket: null,
        override_units: Math.round(proj.retailPrice)
      });

      // Add baseline units override
      allOverrides.push({
        sku: proj.sku,
        size: null,
        bucket: null,
        override_units: Math.round(proj.baselineUnits)
      });

      // Add size breakdowns
      for (const [size, units] of Object.entries(proj.sizeBreakdown)) {
        if (sizeOrder.includes(size)) {
          allOverrides.push({
            sku: proj.sku,
            size,
            bucket: null,
            override_units: Math.round(units as number)
          });
        }
      }

      // Add warehouse allocations
      for (const [locationName, units] of Object.entries(proj.warehouseAllocations || {})) {
        const location = warehouseLocations.find(loc => loc.name === locationName);
        if (location) {
          allOverrides.push({
            sku: proj.sku,
            size: null,
            bucket: location.id,
            override_units: Math.round(units as number)
          });
        }
      }
    }

    console.log(`📤 Sending ${allOverrides.length} overrides in bulk request...`);

    try {
      const response = await fetch('/api/forecast-overrides/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: selectedScenarioId,
          tour_id: tourId,
          overrides: allOverrides
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Bulk save complete: ${result.successCount}/${result.total} succeeded`);
        if (result.errorCount > 0) {
          console.warn(`⚠️ ${result.errorCount} overrides failed to save`);
        }
      } else {
        console.error('Bulk save failed:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to apply recommendations:', error);
      alert('Failed to save projections. Please check console for details.');
      setIsLoadingOverrides(false);
      return;
    }

    console.log('✅ All recommendations applied, reloading page...');
    setAiGenerated(true);
    setIsLoadingOverrides(false);

    // Refresh page to show updated data
    setTimeout(() => window.location.reload(), 500);
  }

  return (
    <section className="g-container py-8">
      {/* 1. AI AGENT PANEL AT TOP */}
      <EnhancedAIAgentPanel
        tourId={tourId}
        scenarioId={selectedScenarioId}
        onGenerateProjections={async () => {
          const response = await fetch('/api/projections/generate-full', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tourId,
              scenarioId: selectedScenarioId,
              expectedAttendance,
              expectedPerHead,
              warehouseLocations // Pass dynamic warehouse locations to AI
            })
          });
          const data = await response.json();
          setProjectionData(data.projections);
          await applyAllRecommendations(data.projections);
        }}
        onApplySizeRecommendation={async (sku, curve) => {
          // Apply size curve recommendation for a single SKU
          const row = rows.find((r) => r.sku === sku);
          if (!row) return;

          // Calculate units for each size based on the curve
          const sizeOverrides = Object.entries(curve).map(([size, pct]) => ({
            sku,
            size,
            bucket: null,
            override_units: Math.round(row.forecastUnits * pct)
          }));

          // Save to database
          await fetch('/api/forecast-overrides/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scenario_id: selectedScenarioId,
              tour_id: tourId,
              overrides: sizeOverrides
            })
          });

          // Update local state
          const newMap = { ...overrideMap };
          sizeOverrides.forEach((o) => {
            newMap[`${o.sku}::${o.size}::`] = String(o.override_units);
          });
          setOverrideMap(newMap);
        }}
        onApplyAllSizeRecommendations={async (analysis) => {
          // Apply all size curve recommendations at once
          const allOverrides: Array<{ sku: string; size: string; bucket: null; override_units: number }> = [];

          Object.entries(analysis).forEach(([sku, data]) => {
            const row = rows.find((r) => r.sku === sku);
            if (!row) return;

            Object.entries(data.recommendedCurve).forEach(([size, pct]) => {
              allOverrides.push({
                sku,
                size,
                bucket: null,
                override_units: Math.round(row.forecastUnits * pct)
              });
            });
          });

          // Save to database
          await fetch('/api/forecast-overrides/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scenario_id: selectedScenarioId,
              tour_id: tourId,
              overrides: allOverrides
            })
          });

          // Reload page to show updated data
          window.location.reload();
        }}
        currentInputs={{ expectedAttendance, expectedPerHead }}
        warehouseLocations={warehouseLocations}
      />

      {/* 2. REORDER ALERTS */}
      {selectedScenarioId && (
        <div className="mt-6">
          <ReorderAlertBanner tourId={tourId} scenarioId={selectedScenarioId} />
        </div>
      )}

      {/* 3. VIEW TOGGLE */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-[var(--color-bg-border)] rounded-lg">
          <button
            onClick={() => setViewMode('aggregate')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              viewMode === 'aggregate'
                ? 'bg-[var(--color-bg-surface)] shadow-sm text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Tour Summary
          </button>
          <button
            onClick={() => setViewMode('by-show')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              viewMode === 'by-show'
                ? 'bg-[var(--color-bg-surface)] shadow-sm text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            By Show
          </button>
        </div>
        {viewMode === 'by-show' && (
          <button
            onClick={() => setShowCopyModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-border)] rounded-lg transition"
          >
            <Copy className="w-4 h-4" />
            Copy from Tour
          </button>
        )}
      </div>

      {/* 4. VISUALIZATIONS (only in aggregate view) */}
      {viewMode === 'aggregate' && aiGenerated && projectionData.length > 0 && (
        <div className="mt-6">
          <ProjectionVisualizations
            projectionData={projectionData}
            historicalData={productSummary}
            showData={showSummary}
            inventoryData={inventoryBalances}
            poData={poOpenQuantities}
          />
        </div>
      )}

      {/* 5. BY-SHOW GRID */}
      {viewMode === 'by-show' && selectedScenarioId && (
        <div className="mt-6 g-card p-6">
          <ShowProjectionGrid
            tourId={tourId}
            scenarioId={selectedScenarioId}
            products={products.map((p) => ({
              sku: p.sku,
              description: p.description,
              sizes: sizeMap.get(p.sku) ?? [],
            }))}
            onDeliveryClick={(showId, sku, size) => {
              // TODO: Get show info for modal
              setDeliveryModal({
                showId,
                showInfo: { date: '', venue: '', city: '' },
                sku,
                size,
              });
            }}
            onCompClick={(showId, sku, size) => {
              // TODO: Get show info for modal
              setCompModal({
                showId,
                showInfo: { date: '', venue: '', city: '' },
                sku,
                size,
              });
            }}
          />
        </div>
      )}

      {/* 6. AGGREGATE SPREADSHEET */}
      {viewMode === 'aggregate' && (
      <div className={isFullscreen ? 'fullscreen-modal' : 'mt-6 g-card p-6'}>
        {/* Fullscreen Header */}
        {isFullscreen && (
          <div className="fullscreen-modal-header mb-4">
            <h2 className="text-lg font-semibold">Projection Sheet - Full View</h2>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 hover:bg-[var(--color-bg-elevated)] rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-[var(--color-text-muted)]">Scenario</label>
            <select
              className="g-input"
              value={selectedScenarioId}
              onChange={(event) => setSelectedScenarioId(event.target.value)}
            >
              {scenarioList.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                  {scenario.is_baseline ? ' (baseline)' : ''}
                </option>
              ))}
            </select>
            <button type="button" className="g-button g-button-outline text-xs" onClick={createScenario}>
              Create
            </button>
            <button type="button" className="g-button g-button-outline text-xs" onClick={duplicateScenario}>
              Duplicate
            </button>
            <button type="button" className="g-button g-button-outline text-xs" onClick={setBaseline}>
              Set baseline
            </button>
            <button type="button" className="g-button g-button-outline text-xs" onClick={deleteScenario}>
              Delete
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="g-button g-button-outline text-xs flex items-center gap-1"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              {isFullscreen ? 'Exit Fullscreen' : 'Expand'}
            </button>
            <Link
              href={`/tours/${tourId}/projections/compare`}
              className="g-button g-button-outline text-xs"
            >
              Compare Scenarios
            </Link>
            <button type="button" className="g-button g-button-outline text-xs" onClick={exportCsv}>
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="g-panel">
            <label className="g-label">Expected attendance</label>
            <input
              className="g-input w-full"
              type="number"
              value={Math.round(expectedAttendance)}
              onChange={(event) => setExpectedAttendance(Number(event.target.value))}
            />
          </div>
          <div className="g-panel">
            <label className="g-label">Expected per-head</label>
            <input
              className="g-input w-full"
              type="number"
              value={expectedPerHead.toFixed(2)}
              onChange={(event) => setExpectedPerHead(Number(event.target.value))}
            />
          </div>
          <div className="g-panel">
            <label className="g-label">Expected gross</label>
            <div className="text-lg font-semibold">
              {(expectedAttendance * expectedPerHead).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
              })}
            </div>
          </div>
        </div>

        <div className="spreadsheet-container mt-6">
          {isLoadingOverrides ? (
            <p className="text-sm text-[var(--color-text-muted)] p-4">Loading overrides…</p>
          ) : (
            <table className="spreadsheet">
              <thead>
                <tr>
                  <th className="sticky-col sticky-col-1">SKU</th>
                  <th className="sticky-col sticky-col-2">Design</th>
                  <th>Price</th>
                  <th>% Gross</th>
                  <th>On Hand</th>
                  <th>On Order</th>
                  <th>Forecast</th>
                  {sizeOrder.map((size) => (
                    <th key={size}>{size}</th>
                  ))}
                  {warehouseLocations.map((location) => (
                    <th key={location.id}>{location.name}</th>
                  ))}
                  <th>Gross</th>
                  <th>COGS</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const warning = row.onHand + row.onOrder < row.forecastUnits;
                  return (
                    <tr key={row.sku} className={warning ? 'warning-row' : ''}>
                      <td className="sticky-col sticky-col-1">
                        <div className="font-semibold text-xs">{row.sku}</div>
                        {warning && (
                          <div className="text-[10px] text-[var(--color-red-primary)]">Low stock</div>
                        )}
                      </td>
                      <td className="sticky-col sticky-col-2">
                        <div className="text-xs truncate max-w-[130px]" title={row.description}>
                          {row.description}
                        </div>
                      </td>
                      <td>
                        <input
                          className="spreadsheet-input"
                          type="number"
                          value={overrideMap[`${row.sku}::PRICE::`] ?? row.price.toFixed(2)}
                          onChange={(event) =>
                            updateOverride(row.sku, 'PRICE', null, event.target.value)
                          }
                          onBlur={(event) =>
                            saveOverride(row.sku, 'PRICE', null, event.target.value)
                          }
                        />
                      </td>
                      <td>{(row.share * 100).toFixed(1)}%</td>
                      <td>{row.onHand.toFixed(0)}</td>
                      <td>{row.onOrder.toFixed(0)}</td>
                      <td>
                        <input
                          className="spreadsheet-input"
                          type="number"
                          value={overrideMap[`${row.sku}::::`] ?? row.forecastUnits.toFixed(0)}
                          onChange={(event) => updateOverride(row.sku, null, null, event.target.value)}
                          onBlur={(event) => saveOverride(row.sku, null, null, event.target.value)}
                        />
                      </td>
                      {sizeOrder.map((size) => (
                        <td key={`${row.sku}-${size}`}>
                          <input
                            className="spreadsheet-input"
                            type="number"
                            value={
                              overrideMap[`${row.sku}::${size}::`] ??
                              (row.sizeBreakdown[size] ?? 0)
                            }
                            onChange={(event) =>
                              updateOverride(row.sku, size, null, event.target.value)
                            }
                            onBlur={(event) =>
                              saveOverride(row.sku, size, null, event.target.value)
                            }
                          />
                        </td>
                      ))}
                      {warehouseLocations.map((location) => (
                        <td key={`${row.sku}-${location.id}`}>
                          <input
                            className="spreadsheet-input"
                            type="number"
                            value={
                              overrideMap[`${row.sku}::::${location.id}`] ??
                              row.warehouseAllocations[location.id]
                            }
                            onChange={(event) =>
                              updateOverride(row.sku, null, location.id, event.target.value)
                            }
                            onBlur={(event) =>
                              saveOverride(row.sku, null, location.id, event.target.value)
                            }
                          />
                        </td>
                      ))}
                      <td className="font-medium">
                        {row.forecastGross.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 0
                        })}
                      </td>
                      <td>
                        {row.forecastCogs.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 0
                        })}
                      </td>
                      <td className={row.forecastMargin > 0 ? 'text-green-600' : 'text-red-600'}>
                        {row.forecastMargin.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 0
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="sticky-col sticky-col-1 font-semibold">Totals</td>
                  <td className="sticky-col sticky-col-2"></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="font-semibold">{totals.units.toFixed(0)}</td>
                  {sizeOrder.map((size) => (
                    <td key={size}></td>
                  ))}
                  {warehouseLocations.map((location) => (
                    <td key={location.id}></td>
                  ))}
                  <td className="font-semibold">
                    {totals.gross.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 0
                    })}
                  </td>
                  <td className="font-semibold">
                    {totals.cogs.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 0
                    })}
                  </td>
                  <td className="font-semibold">
                    {totals.margin.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 0
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
      )}

      {/* Modals */}
      {deliveryModal && (
        <DeliveryEditor
          tourId={tourId}
          showId={deliveryModal.showId}
          showInfo={deliveryModal.showInfo}
          sku={deliveryModal.sku}
          size={deliveryModal.size}
          onClose={() => setDeliveryModal(null)}
          onSave={() => {
            setDeliveryModal(null);
            // Trigger refresh of show data
          }}
        />
      )}

      {compModal && (
        <CompBreakdownPanel
          tourId={tourId}
          showId={compModal.showId}
          showInfo={compModal.showInfo}
          sku={compModal.sku}
          size={compModal.size}
          onClose={() => setCompModal(null)}
          onSave={() => {
            setCompModal(null);
            // Trigger refresh of show data
          }}
        />
      )}

      {showCopyModal && selectedScenarioId && (
        <CopyFromTourModal
          tourId={tourId}
          targetScenarioId={selectedScenarioId}
          onClose={() => setShowCopyModal(false)}
          onCopyComplete={() => {
            setShowCopyModal(false);
            // Trigger page refresh to show copied data
            window.location.reload();
          }}
        />
      )}
    </section>
  );
}
