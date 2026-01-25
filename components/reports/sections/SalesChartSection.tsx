'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesChartSectionProps {
  title: string;
  showSummary: any[];
}

export function SalesChartSection({ title, showSummary }: SalesChartSectionProps) {
  // Prepare chart data
  const chartData = showSummary.map(show => ({
    city: show.city || show.venue_name || 'Unknown',
    gross: show.total_gross || 0,
    date: show.show_date
  }));

  // Calculate totals
  const totalGross = chartData.reduce((sum, item) => sum + item.gross, 0);
  const avgGross = chartData.length > 0 ? totalGross / chartData.length : 0;

  return (
    <section className="print:page-break-inside-avoid">
      <div className="mb-6">
        <h2 className="text-3xl font-bold g-title mb-2">{title}</h2>
        <div className="flex gap-6 text-sm text-[var(--g-text-muted)]">
          <div>
            <span className="font-semibold">Total: </span>
            ${totalGross.toLocaleString()}
          </div>
          <div>
            <span className="font-semibold">Average: </span>
            ${avgGross.toLocaleString()}
          </div>
          <div>
            <span className="font-semibold">Shows: </span>
            {chartData.length}
          </div>
        </div>
      </div>

      <div className="g-card p-6">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--g-border)" />
            <XAxis
              dataKey="city"
              angle={-45}
              textAnchor="end"
              height={120}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              formatter={(value: any) => [`$${value.toLocaleString()}`, 'Gross Sales']}
              labelStyle={{ color: 'var(--g-text)' }}
              contentStyle={{
                backgroundColor: 'var(--g-bg-surface)',
                border: '1px solid var(--g-border)',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="gross" fill="var(--g-accent)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
