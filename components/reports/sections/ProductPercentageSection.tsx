'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ProductPercentageSectionProps {
  products: any[];
}

const COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#6B7280', // Gray
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange-red
  '#8B5CF6'  // Violet
];

export function ProductPercentageSection({ products }: ProductPercentageSectionProps) {
  // Calculate total gross
  const totalGross = products.reduce((sum, p) => sum + (p.total_gross || 0), 0);

  // Prepare chart data - top 10 products by gross
  const chartData = products
    .map(product => ({
      name: product.description || product.sku,
      sku: product.sku,
      value: product.total_gross || 0,
      units: product.total_sold || 0,
      percent: totalGross > 0 ? ((product.total_gross || 0) / totalGross * 100) : 0
    }))
    .filter(p => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 products

  // Calculate "Other" category
  const chartTotal = chartData.reduce((sum, item) => sum + item.value, 0);
  const otherValue = totalGross - chartTotal;

  if (otherValue > 0) {
    chartData.push({
      name: 'Other Products',
      sku: '',
      value: otherValue,
      units: 0,
      percent: (otherValue / totalGross * 100)
    });
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="g-card p-3 shadow-lg">
          <p className="font-semibold g-title">{data.name}</p>
          {data.sku && (
            <p className="text-xs text-[var(--g-text-muted)] font-mono">{data.sku}</p>
          )}
          <p className="text-sm text-[var(--g-text-muted)] mt-1">
            <span className="font-semibold">${data.value.toLocaleString()}</span>
            {' '}({data.percent.toFixed(1)}%)
          </p>
          {data.units > 0 && (
            <p className="text-xs text-[var(--g-text-muted)]">
              {data.units.toLocaleString()} units
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <section className="print:page-break-inside-avoid">
      <div className="mb-6">
        <h2 className="text-3xl font-bold g-title mb-2">Product % Breakdown</h2>
        <div className="text-sm text-[var(--g-text-muted)]">
          <span className="font-semibold">Total Gross: </span>
          ${totalGross.toLocaleString()}
        </div>
      </div>

      <div className="g-card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <div>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.percent.toFixed(1)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Table */}
          <div className="overflow-y-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--g-bg-surface)]">
                <tr className="border-b border-[var(--g-border)]">
                  <th className="text-left py-2 px-2 font-semibold g-title">Product</th>
                  <th className="text-right py-2 px-2 font-semibold g-title">Gross</th>
                  <th className="text-right py-2 px-2 font-semibold g-title">%</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item, index) => (
                  <tr key={item.sku || item.name} className="border-b border-[var(--g-border)]">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.sku && (
                            <div className="text-xs text-[var(--g-text-muted)] font-mono">
                              {item.sku}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right text-[var(--g-text-muted)]">
                      ${item.value.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold">
                      {item.percent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
