'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerHeadsChartSectionProps {
  title: string;
  showSummary: any[];
}

export function PerHeadsChartSection({ title, showSummary }: PerHeadsChartSectionProps) {
  // Prepare chart data - calculate per head for each show
  const chartData = showSummary
    .map(show => {
      const gross = show.total_gross || 0;
      const attendance = show.attendance || 0;
      const perHead = attendance > 0 ? gross / attendance : 0;

      return {
        city: show.city || show.venue_name || 'Unknown',
        perHead: Math.round(perHead * 100) / 100,
        attendance,
        gross,
        date: show.show_date
      };
    })
    .filter(item => item.perHead > 0); // Only show shows with valid data

  // Calculate averages
  const totalPerHead = chartData.reduce((sum, item) => sum + item.perHead, 0);
  const avgPerHead = chartData.length > 0 ? totalPerHead / chartData.length : 0;

  return (
    <section className="print:page-break-inside-avoid">
      <div className="mb-6">
        <h2 className="text-3xl font-bold g-title mb-2">{title}</h2>
        <div className="flex gap-6 text-sm text-[var(--g-text-muted)]">
          <div>
            <span className="font-semibold">Average Per Head: </span>
            ${avgPerHead.toFixed(2)}
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
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              formatter={(value: any) => [`$${value.toFixed(2)}`, 'Per Head']}
              labelFormatter={(label) => {
                const show = chartData.find(d => d.city === label);
                return `${label}${show ? ` (${show.attendance.toLocaleString()} attendance)` : ''}`;
              }}
              labelStyle={{ color: 'var(--g-text)' }}
              contentStyle={{
                backgroundColor: 'var(--g-bg-surface)',
                border: '1px solid var(--g-border)',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="perHead" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
