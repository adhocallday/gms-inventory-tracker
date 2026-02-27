'use client';

interface ProductPerformanceChartProps {
  products: Array<{
    sku: string;
    baselineUnits: number;
    retailPrice: number;
  }>;
  historicalData: Array<{
    sku: string;
    total_sold?: number | null;
    total_gross?: number | null;
  }>;
}

export function ProductPerformanceChart({ products, historicalData }: ProductPerformanceChartProps) {
  // Merge forecast and historical data
  const mergedData = products.map(p => {
    const historical = historicalData.find(h => h.sku === p.sku);
    return {
      sku: p.sku,
      forecastUnits: p.baselineUnits,
      historicalUnits: historical?.total_sold || 0,
      forecastGross: p.baselineUnits * p.retailPrice,
      historicalGross: historical?.total_gross || 0
    };
  });

  const maxUnits = Math.max(...mergedData.flatMap(p => [p.forecastUnits, p.historicalUnits]), 1);

  return (
    <div className="g-card p-4">
      <h4 className="text-sm font-semibold mb-3">Forecast vs Historical Performance</h4>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {mergedData.slice(0, 10).map(p => (
          <div key={p.sku}>
            <div className="text-xs font-medium mb-1">{p.sku}</div>
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">
                  Historical: {p.historicalUnits.toLocaleString()}
                </div>
                <div className="h-4 bg-blue-500/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${(p.historicalUnits / maxUnits) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">
                  Forecast: {p.forecastUnits.toLocaleString()}
                </div>
                <div className="h-4 bg-green-500/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${(p.forecastUnits / maxUnits) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
