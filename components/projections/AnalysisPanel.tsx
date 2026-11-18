'use client';

interface AnalysisPanelProps {
  analysis: any;
  loading: boolean;
}

const sectionCard =
  'bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-lg p-6 space-y-4';

const statisticCard =
  'bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-lg p-4 shadow-sm';

export function AnalysisPanel({ analysis, loading }: AnalysisPanelProps) {
  if (loading) {
    return <div className="text-center py-8 text-[var(--color-text-secondary)]">Analyzing...</div>;
  }

  if (!analysis) {
    return (
      <div className="text-center py-8 text-[var(--color-text-secondary)]">
        No analysis available. Generate projections to see the analysis.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product Performance */}
      <section className={sectionCard}>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Product performance
          </h3>
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
            Updated in real time
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className={statisticCard}>
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Top performers</p>
            <div className="space-y-2">
              {analysis.productPerformance?.topPerformers?.slice(0, 3).map((p: any) => (
                <div key={p.sku} className="space-y-1">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{p.sku}</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    {p.totalSold} sold · ${p.margin.toFixed(0)} margin
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={statisticCard}>
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Underperformers</p>
            <div className="space-y-2">
              {analysis.productPerformance?.underperformers?.slice(0, 3).map((p: any) => (
                <div key={p.sku} className="space-y-1">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{p.sku}</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    {p.totalSold} sold · ${p.margin.toFixed(0)} margin
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={statisticCard}>
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Opportunities</p>
            <div className="space-y-2">
              {analysis.productPerformance?.opportunities?.slice(0, 3).map((p: any) => (
                <div key={p.sku} className="space-y-1">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{p.sku}</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">{p.reasoning}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stockout Risks */}
      {analysis.stockoutRisks?.length > 0 && (
        <section className={sectionCard}>
          <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">Stockout risks</h3>
          <div className="space-y-3">
            {analysis.stockoutRisks.map((risk: any, idx: number) => (
              <div
                key={idx}
                className={`rounded-lg border p-4 shadow-sm ${
                  risk.riskLevel === 'critical'
                    ? 'bg-danger-bg border-danger-border text-danger'
                    : risk.riskLevel === 'high'
                    ? 'bg-warn-bg border-warn-border text-warn'
                    : 'bg-warn-bg border-warn-border text-warn'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{risk.sku}{risk.size ? ` · ${risk.size}` : ''}</span>
                  <span className="text-xs font-semibold">
                    {risk.riskLevel} risk
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  Forecast demand: {risk.forecastDemand} · Current supply: {risk.currentSupply}
                </div>
                <div className="text-xs text-[var(--color-text-primary)] mt-1">{risk.recommendation}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Size Curves */}
      {analysis.sizeCurveRecommendations?.length > 0 && (
        <section className={sectionCard}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Size distribution recommendations
            </h3>
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
              {analysis.sizeCurveRecommendations.length} SKUs
            </span>
          </div>
          <div className="space-y-4">
            {analysis.sizeCurveRecommendations.slice(0, 5).map((curve: any) => (
              <div key={curve.sku} className="bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{curve.sku}</div>
                  <span className="text-xs text-[var(--color-text-secondary)]">Confidence: {curve.confidence ? `${Math.round(curve.confidence * 100)}%` : 'n/a'}</span>
                </div>
                <div className="grid grid-cols-6 gap-2 text-xs mb-2">
                  {Object.entries(curve.recommendedCurve).map(([size, pct]: [string, any]) => (
                    <div key={size} className="text-center">
                      <div className="text-[var(--color-text-secondary)]">{size}</div>
                      <div className="font-semibold">{Math.round(pct * 100)}%</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">{curve.reasoning}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
