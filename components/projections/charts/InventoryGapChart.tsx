'use client';

interface InventoryGapChartProps {
  gaps: Array<{
    sku: string;
    size?: string;
    forecastDemand: number;
    onHand: number;
    onOrder: number;
    gap: number;
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
  }>;
}

export function InventoryGapChart({ gaps }: InventoryGapChartProps) {
  const riskColors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  };

  const filteredGaps = gaps.filter(g => g.gap > 0).slice(0, 10);

  if (filteredGaps.length === 0) {
    return (
      <div className="g-card p-4">
        <h4 className="text-sm font-semibold mb-3">Inventory Gaps & Stockout Risks</h4>
        <p className="text-sm text-green-500">✓ No stockout risks detected. All forecasts can be met with current inventory + open orders.</p>
      </div>
    );
  }

  return (
    <div className="g-card p-4">
      <h4 className="text-sm font-semibold mb-3">Inventory Gaps & Stockout Risks</h4>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredGaps.map((g, i) => (
          <div key={i} className="flex items-center gap-3 p-2 border border-[var(--color-bg-border)] rounded-lg hover:bg-[var(--color-bg-elevated)] transition">
            <div className={`w-2 h-2 rounded-full ${riskColors[g.riskLevel]}`} />
            <div className="flex-1">
              <div className="text-xs font-medium">
                {g.sku} {g.size && `· ${g.size}`}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                Need {g.forecastDemand} · Have {g.onHand} on hand + {g.onOrder} on order = <span className="text-red-500 font-semibold">Short {g.gap}</span>
              </div>
            </div>
            <div className={`text-xs uppercase tracking-wide px-2 py-1 rounded ${riskColors[g.riskLevel]} bg-opacity-20`}>
              {g.riskLevel}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
