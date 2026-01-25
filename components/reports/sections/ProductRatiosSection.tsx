'use client';

interface ProductRatiosSectionProps {
  products: any[];
  showSummary: any[];
}

export function ProductRatiosSection({ products, showSummary }: ProductRatiosSectionProps) {
  // Calculate total attendance
  const totalAttendance = showSummary.reduce((sum, show) => sum + (show.attendance || 0), 0);

  // Calculate ratios for each product
  const productRatios = products
    .map(product => {
      const units = product.total_sold || 0;
      const ratio = totalAttendance > 0 && units > 0 ? totalAttendance / units : 0;

      return {
        sku: product.sku,
        description: product.description,
        units,
        ratio: Math.round(ratio),
        percent: totalAttendance > 0 ? (units / totalAttendance * 100).toFixed(2) : '0.00'
      };
    })
    .filter(p => p.ratio > 0)
    .sort((a, b) => a.ratio - b.ratio) // Sort by ratio (lowest = most popular)
    .slice(0, 20); // Top 20 products

  return (
    <section className="print:page-break-inside-avoid">
      <div className="mb-6">
        <h2 className="text-3xl font-bold g-title mb-2">Product Ratios</h2>
        <p className="text-sm text-[var(--g-text-muted)]">
          Shows how many attendees purchased each product (e.g., "1 in 8" means 1 out of every 8 attendees bought this item)
        </p>
        <div className="mt-2 text-sm text-[var(--g-text-muted)]">
          <span className="font-semibold">Total Attendance: </span>
          {totalAttendance.toLocaleString()}
        </div>
      </div>

      <div className="g-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--g-border)]">
                <th className="text-left py-3 px-4 text-sm font-semibold g-title">Product</th>
                <th className="text-left py-3 px-4 text-sm font-semibold g-title">SKU</th>
                <th className="text-right py-3 px-4 text-sm font-semibold g-title">Units Sold</th>
                <th className="text-right py-3 px-4 text-sm font-semibold g-title">Ratio</th>
                <th className="text-right py-3 px-4 text-sm font-semibold g-title">Penetration %</th>
              </tr>
            </thead>
            <tbody>
              {productRatios.map((product, index) => (
                <tr
                  key={product.sku}
                  className={`border-b border-[var(--g-border)] ${
                    index % 2 === 0 ? 'bg-[var(--g-bg-muted)]' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-sm">
                    {product.description || 'No description'}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-[var(--g-text-muted)]">
                    {product.sku}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold">
                    {product.units.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    <span className="font-semibold text-[var(--g-accent)]">
                      1 in {product.ratio}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-[var(--g-text-muted)]">
                    {product.percent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {productRatios.length === 0 && (
          <div className="text-center py-8 text-[var(--g-text-muted)]">
            No product ratio data available
          </div>
        )}
      </div>
    </section>
  );
}
