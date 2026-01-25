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
  const typeColors = {
    baseline: 'bg-blue-500/10 text-blue-500',
    size_adjustment: 'bg-purple-500/10 text-purple-500',
    risk_mitigation: 'bg-red-500/10 text-red-500',
    product_priority: 'bg-green-500/10 text-green-500'
  };

  const colorClass = typeColors[recommendation.recommendation_type as keyof typeof typeColors] || 'bg-gray-500/10 text-gray-500';

  return (
    <div className="border border-[var(--g-border)] rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-1 rounded-full ${colorClass}`}>
              {recommendation.recommendation_type.replace('_', ' ')}
            </span>
            <span className="text-xs text-[var(--g-text-muted)]">
              Confidence: {Math.round((recommendation.confidence_score || 0) * 100)}%
            </span>
          </div>

          <div className="text-sm font-semibold">
            {recommendation.target_sku}
            {recommendation.target_size && ` · ${recommendation.target_size}`}
            {recommendation.target_bucket && ` · ${recommendation.target_bucket}`}
          </div>

          <div className="text-2xl font-bold text-[var(--g-accent)] mt-1">
            {recommendation.recommended_units.toLocaleString()} units
          </div>

          <p className="text-sm text-[var(--g-text-dim)] mt-2">
            {recommendation.reasoning}
          </p>
        </div>
      </div>

      {recommendation.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition text-sm"
          >
            Accept & Apply
          </button>
          <button
            onClick={onReject}
            className="px-4 py-2 border border-[var(--g-border)] rounded-lg hover:bg-white/5 transition text-sm"
          >
            Reject
          </button>
        </div>
      )}

      {recommendation.status === 'accepted' && (
        <div className="text-sm text-green-500">✓ Applied to projection</div>
      )}

      {recommendation.status === 'rejected' && (
        <div className="text-sm text-red-500">✗ Rejected</div>
      )}
    </div>
  );
}
