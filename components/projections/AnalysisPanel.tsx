'use client';

interface AnalysisPanelProps {
  analysis: any;
  loading: boolean;
}

export function AnalysisPanel({ analysis, loading }: AnalysisPanelProps) {
  if (loading) {
    return <div className="text-center py-8 text-[var(--g-text-muted)]">Analyzing...</div>;
  }

  if (!analysis) {
    return (
      <div className="text-center py-8 text-[var(--g-text-muted)]">
        No analysis available. Click "Get AI Recommendations" to generate.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product Performance */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Product Performance</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-sm font-medium text-[var(--g-text-muted)] mb-2">Top Performers</h4>
            <div className="space-y-2">
              {analysis.productPerformance?.topPerformers?.slice(0, 3).map((p: any) => (
                <div key={p.sku} className="p-2 bg-green-500/10 rounded border border-green-500/20">
                  <div className="text-sm font-semibold">{p.sku}</div>
                  <div className="text-xs text-[var(--g-text-dim)]">{p.totalSold} sold · ${p.margin.toFixed(0)} margin</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-[var(--g-text-muted)] mb-2">Underperformers</h4>
            <div className="space-y-2">
              {analysis.productPerformance?.underperformers?.slice(0, 3).map((p: any) => (
                <div key={p.sku} className="p-2 bg-red-500/10 rounded border border-red-500/20">
                  <div className="text-sm font-semibold">{p.sku}</div>
                  <div className="text-xs text-[var(--g-text-dim)]">{p.totalSold} sold · ${p.margin.toFixed(0)} margin</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-[var(--g-text-muted)] mb-2">Opportunities</h4>
            <div className="space-y-2">
              {analysis.productPerformance?.opportunities?.slice(0, 3).map((p: any) => (
                <div key={p.sku} className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                  <div className="text-sm font-semibold">{p.sku}</div>
                  <div className="text-xs text-[var(--g-text-dim)]">{p.reasoning}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stockout Risks */}
      {analysis.stockoutRisks?.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Stockout Risks</h3>
          <div className="space-y-2">
            {analysis.stockoutRisks.map((risk: any, idx: number) => (
              <div
                key={idx}
                className={`p-3 rounded border ${
                  risk.riskLevel === 'critical'
                    ? 'bg-red-500/10 border-red-500/20'
                    : risk.riskLevel === 'high'
                    ? 'bg-orange-500/10 border-orange-500/20'
                    : 'bg-yellow-500/10 border-yellow-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">
                    {risk.sku} {risk.size && `· ${risk.size}`}
                  </span>
                  <span className="text-xs uppercase tracking-wide">{risk.riskLevel} risk</span>
                </div>
                <div className="text-xs text-[var(--g-text-dim)]">
                  Forecast demand: {risk.forecastDemand} · Current supply: {risk.currentSupply}
                </div>
                <div className="text-xs mt-1">{risk.recommendation}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Size Curves */}
      {analysis.sizeCurveRecommendations?.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Size Distribution Recommendations</h3>
          <div className="space-y-3">
            {analysis.sizeCurveRecommendations.slice(0, 5).map((curve: any) => (
              <div key={curve.sku} className="p-3 border border-[var(--g-border)] rounded-lg">
                <div className="text-sm font-semibold mb-2">{curve.sku}</div>
                <div className="grid grid-cols-6 gap-2 text-xs mb-2">
                  {Object.entries(curve.recommendedCurve).map(([size, pct]: [string, any]) => (
                    <div key={size} className="text-center">
                      <div className="text-[var(--g-text-muted)]">{size}</div>
                      <div className="font-semibold">{Math.round(pct * 100)}%</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-[var(--g-text-dim)]">{curve.reasoning}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
