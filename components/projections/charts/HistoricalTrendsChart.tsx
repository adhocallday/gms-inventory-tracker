'use client';

interface HistoricalTrendsChartProps {
  data: Array<{
    show_date?: string | null;
    total_gross?: number | null;
  }>;
}

export function HistoricalTrendsChart({ data }: HistoricalTrendsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="g-card p-4">
        <h4 className="text-sm font-semibold mb-3">Historical Sales Trends</h4>
        <p className="text-sm text-[var(--g-text-muted)]">No historical sales data available</p>
      </div>
    );
  }

  // Sort by date and aggregate
  const chartData = data
    .filter(d => d.show_date && d.total_gross)
    .sort((a, b) => new Date(a.show_date!).getTime() - new Date(b.show_date!).getTime())
    .map(d => ({
      date: d.show_date!,
      gross: d.total_gross || 0
    }));

  const maxGross = Math.max(...chartData.map(d => d.gross), 1);

  return (
    <div className="g-card p-4">
      <h4 className="text-sm font-semibold mb-3">Historical Sales Trends</h4>
      <div className="h-48 flex items-end gap-1">
        {chartData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center min-w-0">
            <div
              className="w-full bg-[var(--g-accent)] rounded-t hover:opacity-80 transition cursor-pointer"
              style={{ height: `${(d.gross / maxGross) * 100}%`, minHeight: d.gross > 0 ? '2px' : '0' }}
              title={`${new Date(d.date).toLocaleDateString()}: $${d.gross.toLocaleString()}`}
            />
            <div className="text-xs text-[var(--g-text-muted)] mt-1 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
              {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-[var(--g-text-muted)]">
        <span>Total: ${chartData.reduce((sum, d) => sum + d.gross, 0).toLocaleString()}</span>
        <span>{chartData.length} shows</span>
      </div>
    </div>
  );
}
