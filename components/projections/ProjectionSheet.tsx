'use client';

import { useEffect, useMemo, useState } from 'react';
import { EnhancedAIAgentPanel } from './AIAgentPanel';
import { ProjectionVisualizations } from './ProjectionVisualizations';

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
// Note: buckets will be loaded dynamically per tour

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
  const [buckets, setBuckets] = useState<string[]>(['TOUR', 'WEB']); // Default until loaded
  const [citiesLoaded, setCitiesLoaded] = useState(false);

  // Fetch tour cities to build dynamic buckets
  useEffect(() => {
    async function loadTourCities() {
      try {
        const response = await fetch(`/api/tours/${tourId}/cities`);
        if (response.ok) {
          const data = await response.json();
          setBuckets(data.buckets || ['TOUR', 'WEB']);
          setCitiesLoaded(true);
          console.log('📍 Loaded dynamic buckets for tour:', data.buckets);
        }
      } catch (error) {
        console.error('Failed to load tour cities:', error);
        // Fallback to default buckets
        setBuckets(['TOUR', 'CITY_A', 'CITY_B', 'WEB']);
        setCitiesLoaded(true);
      }
    }
    loadTourCities();
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

      const bucketAllocations: Record<string, number> = {};
      buckets.forEach((bucket) => {
        const override = overrideMap[`${sku}::::${bucket}`];
        bucketAllocations[bucket] = override ? Number(override) : 0;
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
        bucketAllocations,
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
      ...buckets,
      'On Hand',
      'On Order',
      'Forecast Gross',
      'Forecast COGS',
      'Forecast Margin'
    ];
    const lines = [header.join(',')];
    rows.forEach((row) => {
      const sizes = sizeOrder.map((size) => row.sizeBreakdown[size] ?? 0);
      const bucketValues = buckets.map((bucket) => row.bucketAllocations[bucket] ?? 0);
      lines.push(
        [
          row.sku,
          `"${row.description.replace(/"/g, '""')}"`,
          row.price.toFixed(2),
          row.forecastUnits.toFixed(0),
          ...sizes.map((value) => value.toFixed(0)),
          ...bucketValues.map((value) => value.toFixed(0)),
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
        buckets: Object.keys(proj.bucketAllocation || {})
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

      // Add bucket allocations
      for (const [bucket, units] of Object.entries(proj.bucketAllocation)) {
        if (buckets.includes(bucket)) {
          allOverrides.push({
            sku: proj.sku,
            size: null,
            bucket,
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
              buckets // Pass dynamic buckets to AI
            })
          });
          const data = await response.json();
          setProjectionData(data.projections);
          await applyAllRecommendations(data.projections);
        }}
        currentInputs={{ expectedAttendance, expectedPerHead }}
      />

      {/* 2. VISUALIZATIONS IN MIDDLE */}
      {aiGenerated && projectionData.length > 0 && (
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

      {/* 3. SPREADSHEET AT BOTTOM */}
      <div className="mt-6 g-card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-[var(--g-text-muted)]">Scenario</label>
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

      <div className="overflow-x-auto mt-6">
        {isLoadingOverrides ? (
          <p className="text-sm text-[var(--g-text-muted)]">Loading overrides…</p>
        ) : (
          <table className="min-w-[1200px] text-sm g-table">
            <thead className="text-left border-b border-white/10">
              <tr>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Design</th>
                <th className="py-2 pr-4 text-right">Price</th>
                <th className="py-2 pr-4 text-right">% Gross</th>
                <th className="py-2 pr-4 text-right">On hand</th>
                <th className="py-2 pr-4 text-right">On order</th>
                <th className="py-2 pr-4 text-right">Forecast units</th>
                {sizeOrder.map((size) => (
                  <th key={size} className="py-2 pr-4 text-right">
                    {size}
                  </th>
                ))}
                {buckets.map((bucket) => (
                  <th key={bucket} className="py-2 pr-4 text-right">
                    {bucket}
                  </th>
                ))}
                <th className="py-2 pr-4 text-right">Gross</th>
                <th className="py-2 pr-4 text-right">COGS</th>
                <th className="py-2 pr-4 text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const warning = row.onHand + row.onOrder < row.forecastUnits;
                return (
                  <tr key={row.sku} className="border-b border-white/10">
                    <td className="py-3 pr-4">
                      <div className="font-semibold">{row.sku}</div>
                      {warning ? (
                        <div className="text-xs text-[var(--g-accent)]">
                          Low stock vs forecast
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">{row.description}</td>
                    <td className="py-3 pr-4 text-right">
                      <input
                        className="g-input w-20 text-right"
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
                    <td className="py-3 pr-4 text-right">
                      {(row.share * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 pr-4 text-right">{row.onHand.toFixed(0)}</td>
                    <td className="py-3 pr-4 text-right">{row.onOrder.toFixed(0)}</td>
                    <td className="py-3 pr-4 text-right">
                      <input
                        className="g-input w-20 text-right"
                        type="number"
                        value={overrideMap[`${row.sku}::::`] ?? row.forecastUnits.toFixed(0)}
                        onChange={(event) => updateOverride(row.sku, null, null, event.target.value)}
                        onBlur={(event) => saveOverride(row.sku, null, null, event.target.value)}
                      />
                    </td>
                    {sizeOrder.map((size) => (
                      <td key={`${row.sku}-${size}`} className="py-3 pr-4 text-right">
                        <input
                          className="g-input w-16 text-right"
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
                    {buckets.map((bucket) => (
                      <td key={`${row.sku}-${bucket}`} className="py-3 pr-4 text-right">
                        <input
                          className="g-input w-16 text-right"
                          type="number"
                          value={
                            overrideMap[`${row.sku}::::${bucket}`] ??
                            row.bucketAllocations[bucket]
                          }
                          onChange={(event) =>
                            updateOverride(row.sku, null, bucket, event.target.value)
                          }
                          onBlur={(event) =>
                            saveOverride(row.sku, null, bucket, event.target.value)
                          }
                        />
                      </td>
                    ))}
                    <td className="py-3 pr-4 text-right">
                      {row.forecastGross.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0
                      })}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {row.forecastCogs.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0
                      })}
                    </td>
                    <td className="py-3 pr-4 text-right">
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
              <tr className="border-t border-white/10 font-semibold">
                <td className="py-3 pr-4" colSpan={6}>
                  Totals
                </td>
                <td className="py-3 pr-4 text-right">{totals.units.toFixed(0)}</td>
                <td className="py-3 pr-4" colSpan={sizeOrder.length + buckets.length} />
                <td className="py-3 pr-4 text-right">
                  {totals.gross.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0
                  })}
                </td>
                <td className="py-3 pr-4 text-right">
                  {totals.cogs.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0
                  })}
                </td>
                <td className="py-3 pr-4 text-right">
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
    </section>
  );
}
