'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, RotateCcw, Sparkles, Lock, Unlock } from 'lucide-react';

const sizeOrder = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const sizeColors: Record<string, string> = {
  S: 'bg-blue-500',
  M: 'bg-green-500',
  L: 'bg-yellow-500',
  XL: 'bg-orange-500',
  '2XL': 'bg-red-500',
  '3XL': 'bg-purple-500',
};

interface SizeCurveEditorProps {
  sku: string;
  currentCurve: Record<string, number>;
  historicalCurve: Record<string, number>;
  baselineUnits: number;
  onCurveChange: (sku: string, curve: Record<string, number>) => void;
  onSave: (sku: string, sizeBreakdown: Record<string, number>) => void;
  aiRecommendation?: {
    curve: Record<string, number>;
    reasoning: string;
    confidence: number;
  };
  compact?: boolean;
}

export function SizeCurveEditor({
  sku,
  currentCurve,
  historicalCurve,
  baselineUnits,
  onCurveChange,
  onSave,
  aiRecommendation,
  compact = false,
}: SizeCurveEditorProps) {
  const [editedCurve, setEditedCurve] = useState<Record<string, number>>(currentCurve);
  const [lockedSizes, setLockedSizes] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setEditedCurve(currentCurve);
    setIsDirty(false);
  }, [currentCurve]);

  const sizes = useMemo(() => {
    const allSizes = new Set([
      ...Object.keys(currentCurve),
      ...Object.keys(historicalCurve),
      ...(aiRecommendation ? Object.keys(aiRecommendation.curve) : []),
    ]);
    return sizeOrder.filter((s) => allSizes.has(s));
  }, [currentCurve, historicalCurve, aiRecommendation]);

  const curveSum = useMemo(() => {
    return Object.values(editedCurve).reduce((sum, v) => sum + (v || 0), 0);
  }, [editedCurve]);

  const isValid = Math.abs(curveSum - 1) < 0.01;

  function handlePercentChange(size: string, value: string) {
    const pct = parseFloat(value) / 100;
    if (isNaN(pct)) return;

    const newCurve = { ...editedCurve, [size]: pct };

    // If we need to redistribute, do so among unlocked sizes
    const unlockedSizes = sizes.filter((s) => s !== size && !lockedSizes.has(s));
    const lockedSum = sizes
      .filter((s) => s !== size && lockedSizes.has(s))
      .reduce((sum, s) => sum + (newCurve[s] || 0), 0);

    const remaining = 1 - pct - lockedSum;
    const currentUnlockedSum = unlockedSizes.reduce((sum, s) => sum + (editedCurve[s] || 0), 0);

    if (unlockedSizes.length > 0 && currentUnlockedSum > 0) {
      // Proportionally redistribute
      unlockedSizes.forEach((s) => {
        const ratio = (editedCurve[s] || 0) / currentUnlockedSum;
        newCurve[s] = Math.max(0, remaining * ratio);
      });
    }

    setEditedCurve(newCurve);
    setIsDirty(true);
  }

  function handleReset() {
    setEditedCurve(historicalCurve);
    setIsDirty(true);
  }

  function handleApplyAI() {
    if (aiRecommendation) {
      setEditedCurve(aiRecommendation.curve);
      setIsDirty(true);
    }
  }

  function handleSave() {
    // Convert percentages to units
    const sizeBreakdown: Record<string, number> = {};
    sizes.forEach((size) => {
      sizeBreakdown[size] = Math.round(baselineUnits * (editedCurve[size] || 0));
    });

    onCurveChange(sku, editedCurve);
    onSave(sku, sizeBreakdown);
    setIsDirty(false);
  }

  function toggleLock(size: string) {
    const newLocked = new Set(lockedSizes);
    if (newLocked.has(size)) {
      newLocked.delete(size);
    } else {
      newLocked.add(size);
    }
    setLockedSizes(newLocked);
  }

  const maxPct = Math.max(...sizes.map((s) => Math.max(
    editedCurve[s] || 0,
    historicalCurve[s] || 0,
    aiRecommendation?.curve[s] || 0
  )));

  if (compact) {
    // Compact view - just the bar chart
    return (
      <div className="flex items-center gap-1 h-6">
        {sizes.map((size) => {
          const pct = (currentCurve[size] || 0) * 100;
          return (
            <div
              key={size}
              className="relative h-full flex items-end"
              style={{ width: `${100 / sizes.length}%` }}
              title={`${size}: ${pct.toFixed(0)}%`}
            >
              <div
                className={`w-full ${sizeColors[size]} opacity-70 rounded-t`}
                style={{ height: `${(pct / (maxPct * 100)) * 100}%`, minHeight: '2px' }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Size Distribution</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded transition"
            title="Reset to Historical"
          >
            <RotateCcw className="w-3 h-3" />
            Historical
          </button>
          {aiRecommendation && (
            <button
              onClick={handleApplyAI}
              className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:bg-purple-100 rounded transition"
              title={`Apply AI Recommendation (${(aiRecommendation.confidence * 100).toFixed(0)}% confidence)`}
            >
              <Sparkles className="w-3 h-3" />
              AI ({(aiRecommendation.confidence * 100).toFixed(0)}%)
            </button>
          )}
        </div>
      </div>

      {/* Bar Chart Comparison */}
      <div className="space-y-2">
        {sizes.map((size) => {
          const current = (editedCurve[size] || 0) * 100;
          const historical = (historicalCurve[size] || 0) * 100;
          const ai = aiRecommendation ? (aiRecommendation.curve[size] || 0) * 100 : null;
          const units = Math.round(baselineUnits * (editedCurve[size] || 0));
          const isLocked = lockedSizes.has(size);

          return (
            <div key={size} className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleLock(size)}
                  className={`p-0.5 rounded ${isLocked ? 'text-amber-500' : 'text-slate-400'} hover:bg-slate-200`}
                  title={isLocked ? 'Unlock' : 'Lock'}
                >
                  {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </button>
                <span className="w-8 text-xs font-medium text-slate-600">{size}</span>
                <div className="flex-1 h-4 relative">
                  {/* Historical (background) */}
                  <div
                    className="absolute inset-y-0 left-0 bg-slate-300 rounded opacity-50"
                    style={{ width: `${(historical / (maxPct * 100)) * 100}%` }}
                  />
                  {/* AI recommendation (if different) */}
                  {ai !== null && Math.abs(ai - current) > 1 && (
                    <div
                      className="absolute inset-y-0 left-0 bg-purple-300 rounded opacity-50"
                      style={{ width: `${(ai / (maxPct * 100)) * 100}%` }}
                    />
                  )}
                  {/* Current/edited */}
                  <div
                    className={`absolute inset-y-0 left-0 ${sizeColors[size]} rounded`}
                    style={{ width: `${(current / (maxPct * 100)) * 100}%` }}
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={current.toFixed(0)}
                  onChange={(e) => handlePercentChange(size, e.target.value)}
                  disabled={isLocked}
                  className="w-14 px-1 py-0.5 text-xs text-right border rounded disabled:bg-slate-100 disabled:text-slate-400"
                />
                <span className="text-xs text-slate-500 w-4">%</span>
                <span className="text-xs text-slate-600 w-16 text-right font-mono">{units} units</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation and AI reasoning */}
      <div className="space-y-2">
        {!isValid && (
          <div className="text-xs text-red-500">
            Percentages must sum to 100% (currently {(curveSum * 100).toFixed(1)}%)
          </div>
        )}

        {aiRecommendation && (
          <div className="text-xs text-slate-600 bg-purple-50 p-2 rounded">
            <span className="font-medium text-purple-700">AI Insight:</span>{' '}
            {aiRecommendation.reasoning}
          </div>
        )}
      </div>

      {/* Actions */}
      {isDirty && (
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            onClick={() => {
              setEditedCurve(currentCurve);
              setIsDirty(false);
            }}
            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-200">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 bg-slate-300 rounded opacity-50" />
          <span>Historical</span>
        </div>
        {aiRecommendation && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-purple-300 rounded opacity-50" />
            <span>AI Recommended</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 bg-blue-500 rounded" />
          <span>Current</span>
        </div>
      </div>
    </div>
  );
}
