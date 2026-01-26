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
        <div className="flex items-center gap-3 text-slate-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600" />
          <span>Analyzing size distribution patterns...</span>
        </div>
      </div>
    );
  }

  if (skus.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500">
        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No size analysis available yet.</p>
        <p className="text-sm">Click "Analyze Sizes" to generate recommendations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Insights */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-purple-900">Audience Insights</h3>
        </div>
        <p className="text-sm text-purple-800">{globalInsights.audienceDemographic}</p>

        {globalInsights.sizeTrends.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-purple-700">
              <TrendingUp className="w-4 h-4" />
              Size Trends
            </div>
            <ul className="text-sm text-purple-800 list-disc list-inside">
              {globalInsights.sizeTrends.map((trend, i) => (
                <li key={i}>{trend}</li>
              ))}
            </ul>
          </div>
        )}

        {globalInsights.recommendations.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-purple-700">
              <AlertTriangle className="w-4 h-4" />
              Recommendations
            </div>
            <ul className="text-sm text-purple-800 list-disc list-inside">
              {globalInsights.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Summary and Apply All */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          <span className="font-medium">{skus.length}</span> products analyzed •
          <span className="font-medium text-green-600"> {highConfidenceCount}</span> high confidence
          {hasDifferences && (
            <span className="text-amber-600"> • Adjustments recommended</span>
          )}
        </div>
        {hasDifferences && appliedSkus.size < skus.length && (
          <button
            onClick={handleApplyAll}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
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
              className={`border rounded-lg overflow-hidden ${
                isApplied ? 'border-green-200 bg-green-50' : 'border-slate-200'
              }`}
            >
              {/* Header */}
              <button
                onClick={() => setExpandedSku(isExpanded ? null : sku)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {productNames[sku] ? (
                      <>
                        <span className="text-[var(--g-text)]">{productNames[sku]}</span>
                        <span className="text-[var(--g-text-muted)] font-mono ml-2">({sku})</span>
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
                    <span className="text-xs text-slate-500">
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
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-slate-200 p-4 space-y-4">
                  {/* Reasoning */}
                  <p className="text-sm text-slate-600">{a.reasoning}</p>

                  {/* Size Comparison */}
                  <div className="grid grid-cols-8 gap-2 text-xs">
                    <div className="font-medium text-slate-500">Size</div>
                    {Object.keys(a.historicalCurve).map((size) => (
                      <div key={size} className="font-medium text-center">{size}</div>
                    ))}
                    
                    <div className="text-slate-500">Historical</div>
                    {Object.entries(a.historicalCurve).map(([size, pct]) => (
                      <div key={size} className="text-center text-slate-600">
                        {((pct || 0) * 100).toFixed(0)}%
                      </div>
                    ))}
                    
                    <div className="text-purple-600">Recommended</div>
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
                              : 'text-slate-600'
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
                      <div className="text-xs font-medium text-slate-500">Insights</div>
                      <ul className="text-xs text-slate-600 list-disc list-inside">
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
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition"
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
