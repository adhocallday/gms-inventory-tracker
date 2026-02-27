'use client';

import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, TrendingUp, Users } from 'lucide-react';

interface SizeAnalysis {
  historicalCurve: Record<string, number>;
  recommendedCurve: Record<string, number>;
  confidence: number;
  reasoning: string;
  insights: string[];
}

interface GlobalInsights {
  audienceDemographic: string;
  sizeTrends: string[];
  recommendations: string[];
}

interface SizeAnalysisPanelProps {
  analysis: Record<string, SizeAnalysis>;
  globalInsights: GlobalInsights;
  productNames?: Record<string, string>; // SKU -> Product Name mapping
  onApplyRecommendation: (sku: string, curve: Record<string, number>) => void;
  onApplyAll: () => void;
  isLoading?: boolean;
}

export function SizeAnalysisPanel({
  analysis,
  globalInsights,
  productNames = {},
  onApplyRecommendation,
  onApplyAll,
  isLoading = false,
}: SizeAnalysisPanelProps) {
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [appliedSkus, setAppliedSkus] = useState<Set<string>>(new Set());

  const skus = Object.keys(analysis);
  const highConfidenceCount = skus.filter((sku) => analysis[sku].confidence >= 0.8).length;
  const hasDifferences = skus.some((sku) => {
    const a = analysis[sku];
    return Object.keys(a.historicalCurve).some(
      (size) => Math.abs((a.historicalCurve[size] || 0) - (a.recommendedCurve[size] || 0)) > 0.02
    );
  });

  function handleApply(sku: string) {
    onApplyRecommendation(sku, analysis[sku].recommendedCurve);
    setAppliedSkus((prev) => new Set([...prev, sku]));
  }

  function handleApplyAll() {
    onApplyAll();
    setAppliedSkus(new Set(skus));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--color-red-primary)]" />
          <span>Analyzing size distribution patterns...</span>
        </div>
      </div>
    );
  }

  if (skus.length === 0) {
    return (
      <div className="text-center p-8 text-[var(--color-text-muted)]">
        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No size analysis available yet.</p>
        <p className="text-sm">Click "Analyze Sizes" to generate recommendations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Insights */}
      <div className="border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white/70 rounded-[1.5rem] p-5 shadow-lg shadow-amber-100/60 space-y-4">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Audience Insights</p>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-muted)]">AI context</p>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
          {globalInsights.audienceDemographic || 'Historical crowd data is being summarized for you.'}
        </p>

        {globalInsights.sizeTrends.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Size Trends
            </div>
            <ul className="text-sm text-[var(--color-text-muted)] list-disc list-inside space-y-1">
              {globalInsights.sizeTrends.map((trend, i) => (
                <li key={i}>{trend}</li>
              ))}
            </ul>
          </div>
        )}

        {globalInsights.recommendations.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Recommendations
            </div>
            <ul className="text-sm text-[var(--color-text-muted)] list-disc list-inside space-y-1">
              {globalInsights.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Summary and Apply All */}
      <div className="flex flex-col gap-4 border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] rounded-3xl p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-[var(--color-text-muted)]">
          <span className="font-semibold text-[var(--color-text-primary)]">{skus.length}</span> products analyzed •
          <span className="font-semibold text-green-600"> {highConfidenceCount}</span> high confidence
          {hasDifferences && (
            <span className="text-amber-600"> • Adjustments recommended</span>
          )}
        </div>
        {hasDifferences && appliedSkus.size < skus.length && (
          <button
            onClick={handleApplyAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-red-primary)] text-white rounded-2xl hover:bg-[var(--color-red-hover)] transition text-sm font-semibold shadow-md shadow-[var(--color-red-hover)]/30"
          >
            <Sparkles className="w-4 h-4" />
            Apply All Recommendations
          </button>
        )}
      </div>

      {/* Per-SKU Analysis */}
      <div className="space-y-2">
        {skus.map((sku) => {
          const a = analysis[sku];
          const isExpanded = expandedSku === sku;
          const isApplied = appliedSkus.has(sku);
          const hasChanges = Object.keys(a.historicalCurve).some(
            (size) => Math.abs((a.historicalCurve[size] || 0) - (a.recommendedCurve[size] || 0)) > 0.02
          );

          return (
            <div
              key={sku}
              className={`rounded-[1.5rem] border overflow-hidden shadow-sm ${
                isApplied
                  ? 'border-green-200 bg-emerald-50/70'
                  : 'border-[var(--color-bg-border)] bg-[var(--color-bg-surface)]/80'
              }`}
            >
              {/* Header */}
              <button
                onClick={() => setExpandedSku(isExpanded ? null : sku)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-slate-100 to-white transition hover:from-slate-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {productNames[sku] ? (
                      <>
                        <span className="text-[var(--color-text-primary)]">{productNames[sku]}</span>
                        <span className="text-[var(--color-text-muted)] font-mono ml-2">({sku})</span>
                      </>
                    ) : (
                      <span className="font-mono">{sku}</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        a.confidence >= 0.8
                          ? 'bg-green-500'
                          : a.confidence >= 0.6
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {(a.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  {hasChanges && !isApplied && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                      Adjustment suggested
                    </span>
                  )}
                  {isApplied && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      Applied
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-[var(--color-bg-border)]/60 bg-[var(--color-bg-surface)]/70 p-4 space-y-4">
                  {/* Reasoning */}
                  <p className="text-sm text-[var(--color-text-muted)]">{a.reasoning}</p>

                  {/* Size Comparison */}
                  <div className="grid grid-cols-8 gap-2 text-xs">
                    <div className="font-medium text-[var(--color-text-muted)]">Size</div>
                    {Object.keys(a.historicalCurve).map((size) => (
                      <div key={size} className="font-medium text-center">{size}</div>
                    ))}

                    <div className="text-[var(--color-text-muted)]">Historical</div>
                    {Object.entries(a.historicalCurve).map(([size, pct]) => (
                      <div key={size} className="text-center text-[var(--color-text-muted)]">
                        {((pct || 0) * 100).toFixed(0)}%
                      </div>
                    ))}

                    <div className="text-[var(--color-red-primary)]">Recommended</div>
                    {Object.entries(a.recommendedCurve).map(([size, pct]) => {
                      const hist = a.historicalCurve[size] || 0;
                      const diff = (pct || 0) - hist;
                      return (
                        <div
                          key={size}
                          className={`text-center font-medium ${
                            Math.abs(diff) > 0.02
                              ? diff > 0
                                ? 'text-green-600'
                                : 'text-red-600'
                              : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          {((pct || 0) * 100).toFixed(0)}%
                          {Math.abs(diff) > 0.02 && (
                            <span className="text-xs">
                              {diff > 0 ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Insights */}
                  {a.insights && a.insights.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-[var(--color-text-primary)]">Insights</div>
                      <ul className="text-xs text-[var(--color-text-muted)] list-disc list-inside space-y-1">
                        {a.insights.map((insight, i) => (
                          <li key={i}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Apply Button */}
                  {hasChanges && !isApplied && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleApply(sku)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-red-primary)] text-white rounded hover:bg-[var(--color-red-hover)] transition"
                      >
                        <Sparkles className="w-3 h-3" />
                        Apply Recommendation
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
