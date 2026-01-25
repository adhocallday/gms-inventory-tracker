'use client';

import { useMemo } from 'react';

interface SizeDistributionChartProps {
  sku: string;
  sizeBreakdown: Record<string, number>;
}

export function SizeDistributionChart({ sku, sizeBreakdown }: SizeDistributionChartProps) {
  const total = Object.values(sizeBreakdown).reduce((sum, val) => sum + val, 0);

  const data = useMemo(() => {
    let cumulativeAngle = 0;
    return Object.entries(sizeBreakdown).map(([size, units]) => {
      const percentage = total > 0 ? (units / total) * 100 : 0;
      const angle = (units / total) * 360;
      const startAngle = cumulativeAngle;
      cumulativeAngle += angle;
      return { size, units, percentage, startAngle, endAngle: cumulativeAngle };
    });
  }, [sizeBreakdown, total]);

  // Color palette for sizes
  const sizeColors: Record<string, string> = {
    S: '#3b82f6',
    M: '#8b5cf6',
    L: '#ec4899',
    XL: '#f59e0b',
    '2XL': '#10b981',
    '3XL': '#06b6d4'
  };

  // Simple CSS-based pie chart using conic-gradient
  const gradientStops = data.map(d =>
    `${sizeColors[d.size] || '#6b7280'} ${d.startAngle}deg ${d.endAngle}deg`
  ).join(', ');

  return (
    <div className="g-card p-4">
      <h4 className="text-sm font-semibold mb-3">{sku} - Size Distribution</h4>
      <div className="flex items-center gap-4">
        <div
          className="w-32 h-32 rounded-full"
          style={{ background: `conic-gradient(${gradientStops})` }}
        />
        <div className="flex-1 space-y-1">
          {data.map(d => (
            <div key={d.size} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: sizeColors[d.size] || '#6b7280' }}
                />
                <span>{d.size}</span>
              </div>
              <span className="font-semibold">{d.units} ({d.percentage.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
