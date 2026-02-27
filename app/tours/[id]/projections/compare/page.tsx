'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, RefreshCw } from 'lucide-react';

type Scenario = {
  id: string;
  name: string;
  is_baseline: boolean | null;
};

type ScenarioData = {
  scenario: Scenario;
  overrides: Array<{
    sku: string;
    size: string | null;
    bucket: string | null;
    override_units: number | null;
  }>;
};

type ComparisonData = {
  scenarios: ScenarioData[];
  inventory: Array<{ product_id: string; size: string | null; balance: number | null }>;
  products: Array<{ id: string; sku: string; description: string }>;
  productSummary: Array<{
    product_id: string;
    sku: string;
    description: string;
    size: string | null;
    total_sold: number | null;
    total_gross: number | null;
  }>;
};

const sizeOrder = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

export default function CompareScenariosPage() {
  const params = useParams();
  const tourId = params.id as string;

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tourInfo, setTourInfo] = useState<{ name: string; artist: string } | null>(null);

  // Load scenarios on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Load tour info
        const tourRes = await fetch(`/api/tours/${tourId}`);
        if (tourRes.ok) {
          const tourData = await tourRes.json();
          setTourInfo({ name: tourData.name, artist: tourData.artist });
        }

        // Load scenarios
        const res = await fetch(`/api/forecast-scenarios?tourId=${tourId}`);
        if (res.ok) {
          const data = await res.json();
          setScenarios(data.scenarios || []);
          // Auto-select baseline and first other scenario if available
          const baseline = data.scenarios?.find((s: Scenario) => s.is_baseline);
          const others = data.scenarios?.filter((s: Scenario) => !s.is_baseline) || [];
          if (baseline && others.length > 0) {
            setSelectedIds([baseline.id, others[0].id]);
          }
        }
      } catch (err) {
        console.error('Failed to load scenarios:', err);
      }
    }
    loadData();
  }, [tourId]);

  function toggleScenario(id: string) {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 4) {
        return prev; // Max 4
      }
      return [...prev, id];
    });
  }

  async function handleCompare() {
    if (selectedIds.length < 2) {
      setError('Select at least 2 scenarios to compare');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tours/${tourId}/scenarios/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioIds: selectedIds })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load comparison');
      }

      const data = await res.json();
      setComparisonData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Build comparison grid data
  const comparisonGrid = useMemo(() => {
    if (!comparisonData) return [];

    // Get unique SKUs from all scenarios
    const skuSet = new Set<string>();
    comparisonData.scenarios.forEach(s => {
      s.overrides.forEach(o => skuSet.add(o.sku));
    });

    // Build rows
    const rows: Array<{
      sku: string;
      description: string;
      values: Record<string, Record<string, number>>; // scenarioId -> size -> units
    }> = [];

    skuSet.forEach(sku => {
      const product = comparisonData.products.find(p => p.sku === sku);
      const row: typeof rows[0] = {
        sku,
        description: product?.description || sku,
        values: {}
      };

      comparisonData.scenarios.forEach(s => {
        row.values[s.scenario.id] = {};
        sizeOrder.forEach(size => {
          const override = s.overrides.find(o => o.sku === sku && o.size === size && o.bucket === 'Forecast');
          row.values[s.scenario.id][size] = override?.override_units || 0;
        });
      });

      rows.push(row);
    });

    return rows.sort((a, b) => a.sku.localeCompare(b.sku));
  }, [comparisonData]);

  return (
    <div className="g-container py-12">
      <Link href={`/tours/${tourId}/projections`} className="text-sm font-medium g-link flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" />
        Back to projections
      </Link>

      <div className="mt-4">
        <p className="g-kicker">Compare scenarios</p>
        <h1 className="text-3xl font-semibold g-title mt-2">
          {tourInfo?.name || 'Loading...'}
        </h1>
        {tourInfo?.artist && (
          <p className="text-sm text-[var(--color-text-secondary)]">{tourInfo.artist}</p>
        )}
      </div>

      {/* Scenario Selection */}
      <div className="g-card p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Select Scenarios to Compare (2-4)</h2>

        <div className="flex flex-wrap gap-2">
          {scenarios.map(scenario => (
            <button
              key={scenario.id}
              onClick={() => toggleScenario(scenario.id)}
              className={`px-4 py-2 rounded-lg border-2 transition flex items-center gap-2 ${
                selectedIds.includes(scenario.id)
                  ? 'border-[var(--color-red-primary)] bg-[var(--color-red-primary)]/10 text-[var(--color-red-primary)]'
                  : 'border-[var(--color-bg-border)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              {selectedIds.includes(scenario.id) && <Check className="w-4 h-4" />}
              {scenario.name}
              {scenario.is_baseline && (
                <span className="text-xs bg-[var(--color-bg-border)] px-2 py-0.5 rounded">Baseline</span>
              )}
            </button>
          ))}
        </div>

        {scenarios.length === 0 && (
          <p className="text-[var(--color-text-muted)] text-sm">No scenarios found for this tour.</p>
        )}

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={handleCompare}
            disabled={selectedIds.length < 2 || loading}
            className="px-6 py-2 bg-[var(--color-red-primary)] text-white rounded-lg hover:bg-[var(--color-red-hover)] transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? 'Loading...' : 'Compare Selected'}
          </button>

          <span className="text-sm text-[var(--color-text-muted)]">
            {selectedIds.length} of 4 selected
          </span>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Comparison Grid */}
      {comparisonData && (
        <div className="g-card p-6 mt-6 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Comparison Results</h2>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-bg-border)]">
                <th className="text-left py-2 px-3 font-medium sticky left-0 bg-[var(--color-bg-surface)]">SKU</th>
                <th className="text-left py-2 px-3 font-medium">Design</th>
                {comparisonData.scenarios.map(s => (
                  <th key={s.scenario.id} colSpan={sizeOrder.length} className="text-center py-2 px-3 font-medium border-l border-[var(--color-bg-border)]">
                    {s.scenario.name}
                    {s.scenario.is_baseline && <span className="ml-1 text-xs text-[var(--color-text-muted)]">(Base)</span>}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-[var(--color-bg-border)] bg-[var(--color-bg-muted)]">
                <th className="sticky left-0 bg-[var(--color-bg-muted)]"></th>
                <th></th>
                {comparisonData.scenarios.map(s => (
                  sizeOrder.map(size => (
                    <th key={`${s.scenario.id}-${size}`} className="text-center py-1 px-2 text-xs font-medium text-[var(--color-text-muted)]">
                      {size}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonGrid.map(row => (
                <tr key={row.sku} className="border-b border-[var(--color-bg-border)] hover:bg-[var(--color-bg-muted)]">
                  <td className="py-2 px-3 font-mono text-xs sticky left-0 bg-[var(--color-bg-surface)]">{row.sku}</td>
                  <td className="py-2 px-3 text-xs truncate max-w-[200px]">{row.description}</td>
                  {comparisonData.scenarios.map((s, sIdx) => (
                    sizeOrder.map(size => {
                      const value = row.values[s.scenario.id]?.[size] || 0;
                      const baselineValue = sIdx === 0 ? value : (row.values[comparisonData.scenarios[0].scenario.id]?.[size] || 0);
                      const diff = sIdx === 0 ? 0 : value - baselineValue;

                      return (
                        <td
                          key={`${s.scenario.id}-${size}`}
                          className={`text-center py-2 px-2 text-xs ${
                            sIdx > 0 && diff > 0 ? 'text-emerald-600' :
                            sIdx > 0 && diff < 0 ? 'text-red-600' : ''
                          }`}
                        >
                          {value > 0 ? value : '-'}
                          {sIdx > 0 && diff !== 0 && (
                            <span className="text-[10px] ml-0.5">
                              ({diff > 0 ? '+' : ''}{diff})
                            </span>
                          )}
                        </td>
                      );
                    })
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {comparisonGrid.length === 0 && (
            <p className="text-center text-[var(--color-text-muted)] py-8">
              No forecast data found in selected scenarios.
            </p>
          )}

          {/* Summary Row */}
          {comparisonGrid.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {comparisonData.scenarios.map(s => {
                const totalUnits = comparisonGrid.reduce((sum, row) => {
                  return sum + sizeOrder.reduce((sizeSum, size) => sizeSum + (row.values[s.scenario.id]?.[size] || 0), 0);
                }, 0);

                return (
                  <div key={s.scenario.id} className="g-panel">
                    <p className="text-xs text-[var(--color-text-muted)]">{s.scenario.name}</p>
                    <p className="text-xl font-semibold">{totalUnits.toLocaleString()}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">total units</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
