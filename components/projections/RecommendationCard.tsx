'use client';
import { Check, X } from 'lucide-react';

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
    baseline: { bg: 'bg-info-bg', border: 'border-info-border', text: 'text-info', badge: 'bg-info-bg text-info' },
    size_adjustment: { bg: 'bg-ai-bg', border: 'border-ai-border', text: 'text-ai', badge: 'bg-ai-bg text-ai' },
    risk_mitigation: { bg: 'bg-danger-bg', border: 'border-danger-border', text: 'text-danger', badge: 'bg-danger-bg text-danger' },
    product_priority: { bg: 'bg-success-bg', border: 'border-success-border', text: 'text-success', badge: 'bg-success-bg text-success' }
  };

  const config = typeConfig[recommendation.recommendation_type as keyof typeof typeConfig] ||
    { bg: 'from-[var(--color-bg-elevated)] to-[var(--color-bg-surface)]', border: 'border-[var(--color-bg-border)]', text: 'text-[var(--color-text-primary)]', badge: 'bg-[var(--color-bg-border)] text-[var(--color-text-secondary)]' };

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-5 space-y-4 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${config.badge}`}>
              {recommendation.recommendation_type.replace('_', ' ')}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">
              {Math.round((recommendation.confidence_score || 0) * 100)}% confidence
            </span>
          </div>

          <div className="text-base font-semibold text-[var(--color-text-primary)]">
            {recommendation.target_sku}
            {recommendation.target_size && <span className="text-[var(--color-text-secondary)]"> · {recommendation.target_size}</span>}
            {recommendation.target_bucket && <span className="text-[var(--color-text-secondary)]"> · {recommendation.target_bucket}</span>}
          </div>

          <div className="text-3xl font-bold text-[var(--color-red-primary)] mt-2">
            {recommendation.recommended_units.toLocaleString()} <span className="text-lg font-medium text-[var(--color-text-secondary)]">units</span>
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
            className="flex-1 px-4 py-2.5 bg-[var(--color-red-primary)] text-white rounded-lg hover:bg-[var(--color-red-hover)] transition text-sm font-semibold "
          >
            Accept & apply
          </button>
          <button
            onClick={onReject}
            className="px-4 py-2.5 border border-[var(--color-bg-border)] rounded-lg bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition text-sm font-medium text-[var(--color-text-primary)]"
          >
            Reject
          </button>
        </div>
      )}

      {recommendation.status === 'accepted' && (
        <div className="flex items-center gap-2 text-sm text-success font-medium">
          <span className="w-5 h-5 rounded-full bg-success-bg flex items-center justify-center text-xs"><Check className="h-3 w-3" aria-hidden="true" /></span>
          Applied to projection
        </div>
      )}

      {recommendation.status === 'rejected' && (
        <div className="flex items-center gap-2 text-sm text-danger font-medium">
          <span className="w-5 h-5 rounded-full bg-danger-bg flex items-center justify-center text-xs"><X className="h-3 w-3" aria-hidden="true" /></span>
          Rejected
        </div>
      )}
    </div>
  );
}
