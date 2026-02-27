'use client';

interface RecommendationCardProps {
  recommendation: {
    id: string;
    recommendation_type: string;
    target_sku: string;
    target_size?: string;
    target_bucket?: string;
    recommended_units: number;
    confidence_score: number;
    reasoning: string;
    status: string;
  };
  onAccept: () => void;
  onReject: () => void;
}

export function RecommendationCard({ recommendation, onAccept, onReject }: RecommendationCardProps) {
  const typeConfig = {
    baseline: { bg: 'from-blue-50/80 to-white', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
    size_adjustment: { bg: 'from-purple-50/80 to-white', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
    risk_mitigation: { bg: 'from-red-50/80 to-white', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
    product_priority: { bg: 'from-emerald-50/80 to-white', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' }
  };

  const config = typeConfig[recommendation.recommendation_type as keyof typeof typeConfig] ||
    { bg: 'from-[var(--color-bg-elevated)] to-[var(--color-bg-surface)]', border: 'border-[var(--color-bg-border)]', text: 'text-[var(--color-text-primary)]', badge: 'bg-[var(--color-bg-border)] text-[var(--color-text-secondary)]' };

  return (
    <div className={`bg-gradient-to-br ${config.bg} border-2 ${config.border} rounded-2xl p-5 space-y-4 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${config.badge}`}>
              {recommendation.recommendation_type.replace('_', ' ')}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
              {Math.round((recommendation.confidence_score || 0) * 100)}% confidence
            </span>
          </div>

          <div className="text-base font-semibold text-[var(--color-text-primary)]">
            {recommendation.target_sku}
            {recommendation.target_size && <span className="text-[var(--color-text-muted)]"> · {recommendation.target_size}</span>}
            {recommendation.target_bucket && <span className="text-[var(--color-text-muted)]"> · {recommendation.target_bucket}</span>}
          </div>

          <div className="text-3xl font-bold text-[var(--color-red-primary)] mt-2">
            {recommendation.recommended_units.toLocaleString()} <span className="text-lg font-medium text-[var(--color-text-muted)]">units</span>
          </div>

          <p className="text-sm text-[var(--color-text-secondary)] mt-3 leading-relaxed">
            {recommendation.reasoning}
          </p>
        </div>
      </div>

      {recommendation.status === 'pending' && (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-2.5 bg-[var(--color-red-primary)] text-white rounded-xl hover:bg-[var(--color-red-hover)] transition text-sm font-semibold shadow-md shadow-[var(--color-red-primary)]/20"
          >
            Accept & Apply
          </button>
          <button
            onClick={onReject}
            className="px-4 py-2.5 border border-[var(--color-bg-border)] rounded-xl bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition text-sm font-medium text-[var(--color-text-primary)]"
          >
            Reject
          </button>
        </div>
      )}

      {recommendation.status === 'accepted' && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
          <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-xs">✓</span>
          Applied to projection
        </div>
      )}

      {recommendation.status === 'rejected' && (
        <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
          <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-xs">✗</span>
          Rejected
        </div>
      )}
    </div>
  );
}
