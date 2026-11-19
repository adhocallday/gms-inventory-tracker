'use client';

import { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import type { SuggestedOverride } from '@/lib/ai/chat-tools';

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
    <div className="border border-warn-border bg-warn-bg rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-warn-bg cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-warn animate-pulse" />
          <span className="text-sm font-semibold text-warn">
            Suggested Changes ({overrides.length})
          </span>
        </div>
        <button className="p-1 hover:bg-warn-bg rounded transition">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-warn" />
          ) : (
            <ChevronDown className="w-4 h-4 text-warn" />
          )}
        </button>
      </div>

      {expanded && (
        <>
          {/* Select All */}
          <div className="px-4 py-2 border-b border-warn-border flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.size === overrides.length}
              onChange={toggleAll}
              className="rounded border-warn-border text-warn focus:ring-warn"
            />
            <span className="text-xs text-warn">
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
                  className={`flex items-start gap-3 px-4 py-3 border-b border-warn-border last:border-0 transition ${
                    isSelected ? 'bg-[var(--color-bg-surface)]' : 'bg-warn-bg opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(index)}
                    className="mt-1 rounded border-warn-border text-warn focus:ring-warn"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[var(--color-text-primary)] truncate">
                        {override.productName}
                      </span>
                      {override.size && (
                        <span className="px-1.5 py-0.5 text-xs bg-[var(--color-bg-elevated)] rounded">
                          {override.size}
                        </span>
                      )}
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {override.size ? 'units' : 'total units'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {override.currentValue.toLocaleString()}
                      </span>
                      <ArrowRight className="w-3 h-3 text-[var(--color-text-secondary)]" />
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {override.suggestedValue.toLocaleString()}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          change.isPositive ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {change.diff} ({change.percent})
                      </span>
                    </div>

                    <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-1">
                      {override.reason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary & Actions */}
          <div className="flex items-center justify-between px-4 py-3 bg-warn-bg border-t border-warn-border">
            <div className="text-xs text-warn">
              <span className="font-medium">{selectedIds.size}</span> of{' '}
              <span className="font-medium">{overrides.length}</span> selected
              {selectedIds.size > 0 && (
                <span className="ml-2">
                  (Net change:{' '}
                  <span className={totalChange >= 0 ? 'text-success' : 'text-danger'}>
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
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] rounded-lg transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={handleApply}
                disabled={isApplying || selectedIds.size === 0}
                className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium bg-success text-white rounded-lg hover:bg-success transition disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <span className="w-4 h-4 border border-[var(--color-bg-border)] border-t-white rounded-full animate-spin" />
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
