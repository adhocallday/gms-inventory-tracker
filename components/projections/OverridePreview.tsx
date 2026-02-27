'use client';

import { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import type { SuggestedOverride } from '@/lib/ai/streaming-projection-agent';

interface OverridePreviewProps {
  overrides: SuggestedOverride[];
  onApply: (overrides: SuggestedOverride[]) => void;
  onReject: () => void;
  isApplying?: boolean;
}

export function OverridePreview({
  overrides,
  onApply,
  onReject,
  isApplying = false
}: OverridePreviewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(overrides.map((_, i) => i))
  );
  const [expanded, setExpanded] = useState(true);

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === overrides.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(overrides.map((_, i) => i)));
    }
  };

  const handleApply = () => {
    const selectedOverrides = overrides.filter((_, i) => selectedIds.has(i));
    if (selectedOverrides.length > 0) {
      onApply(selectedOverrides);
    }
  };

  const totalChange = overrides.reduce((sum, o) => {
    if (selectedIds.has(overrides.indexOf(o))) {
      return sum + (o.suggestedValue - o.currentValue);
    }
    return sum;
  }, 0);

  const formatChange = (current: number, suggested: number) => {
    const diff = suggested - current;
    const percent = current > 0 ? ((diff / current) * 100).toFixed(0) : '∞';
    const sign = diff >= 0 ? '+' : '';
    return {
      diff: `${sign}${diff}`,
      percent: `${sign}${percent}%`,
      isPositive: diff >= 0
    };
  };

  if (overrides.length === 0) return null;

  return (
    <div className="border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-amber-100/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm font-semibold text-amber-900">
            Suggested Changes ({overrides.length})
          </span>
        </div>
        <button className="p-1 hover:bg-amber-200/50 rounded transition">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-amber-700" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-700" />
          )}
        </button>
      </div>

      {expanded && (
        <>
          {/* Select All */}
          <div className="px-4 py-2 border-b border-amber-100 flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.size === overrides.length}
              onChange={toggleAll}
              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-xs text-amber-700">
              {selectedIds.size === overrides.length ? 'Deselect all' : 'Select all'}
            </span>
          </div>

          {/* Override List */}
          <div className="max-h-64 overflow-y-auto">
            {overrides.map((override, index) => {
              const change = formatChange(override.currentValue, override.suggestedValue);
              const isSelected = selectedIds.has(index);

              return (
                <div
                  key={`${override.sku}-${override.size || 'total'}-${index}`}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-amber-50 last:border-0 transition ${
                    isSelected ? 'bg-white' : 'bg-amber-50/30 opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(index)}
                    className="mt-1 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[var(--color-text-primary)] truncate">
                        {override.productName}
                      </span>
                      {override.size && (
                        <span className="px-1.5 py-0.5 text-xs bg-[var(--color-bg-muted)] rounded">
                          {override.size}
                        </span>
                      )}
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {override.bucket.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {override.currentValue.toLocaleString()}
                      </span>
                      <ArrowRight className="w-3 h-3 text-[var(--color-text-muted)]" />
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {override.suggestedValue.toLocaleString()}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          change.isPositive ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {change.diff} ({change.percent})
                      </span>
                    </div>

                    <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-1">
                      {override.reason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary & Actions */}
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50/50 border-t border-amber-100">
            <div className="text-xs text-amber-700">
              <span className="font-medium">{selectedIds.size}</span> of{' '}
              <span className="font-medium">{overrides.length}</span> selected
              {selectedIds.size > 0 && (
                <span className="ml-2">
                  (Net change:{' '}
                  <span className={totalChange >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {totalChange >= 0 ? '+' : ''}{totalChange.toLocaleString()} units
                  </span>
                  )
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onReject}
                disabled={isApplying}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-muted)] rounded-lg transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={handleApply}
                disabled={isApplying || selectedIds.size === 0}
                className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Apply {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
