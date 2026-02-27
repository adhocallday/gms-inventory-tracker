'use client';

import { useState } from 'react';
import { X, Gift, Users, Building, Star, Truck } from 'lucide-react';

type CompType = 'band' | 'gms' | 'show' | 'trailer' | 'other';

interface CompBreakdownPanelProps {
  tourId: string;
  showId: string;
  showInfo: {
    date: string;
    venue: string;
    city: string;
  };
  sku: string;
  size: string | null;
  existingComps?: Array<{
    id: string;
    comp_type: CompType;
    quantity: number;
    notes: string | null;
  }>;
  onClose: () => void;
  onSave: () => void;
}

const compTypes: Array<{ value: CompType; label: string; icon: typeof Users; description: string }> = [
  { value: 'band', label: 'Band', icon: Star, description: 'Artist & crew comps' },
  { value: 'gms', label: 'GMS', icon: Building, description: 'Company comps' },
  { value: 'show', label: 'Show', icon: Users, description: 'Venue/promoter comps' },
  { value: 'trailer', label: 'Trailer', icon: Truck, description: 'Production/tour trailer' },
  { value: 'other', label: 'Other', icon: Gift, description: 'Other complimentary items' },
];

export function CompBreakdownPanel({
  tourId,
  showId,
  showInfo,
  sku,
  size,
  existingComps = [],
  onClose,
  onSave,
}: CompBreakdownPanelProps) {
  const [compValues, setCompValues] = useState<Record<CompType, number>>(() => {
    const initial: Record<CompType, number> = {
      band: 0,
      gms: 0,
      show: 0,
      trailer: 0,
      other: 0,
    };
    existingComps.forEach((comp) => {
      initial[comp.comp_type] = comp.quantity;
    });
    return initial;
  });
  const [activeTab, setActiveTab] = useState<CompType>('band');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const totalComps = Object.values(compValues).reduce((sum, val) => sum + val, 0);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build array of comps to save
      const compsToSave = compTypes
        .filter((type) => compValues[type.value] > 0)
        .map((type) => ({
          show_id: showId,
          sku,
          size,
          comp_type: type.value,
          quantity: compValues[type.value],
          notes: notes || null,
        }));

      if (compsToSave.length > 0) {
        const response = await fetch(`/api/tours/${tourId}/comps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(compsToSave),
        });

        if (!response.ok) {
          throw new Error('Failed to save comps');
        }
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save comps:', error);
      alert('Failed to save comps. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleValueChange = (type: CompType, value: number) => {
    setCompValues((prev) => ({
      ...prev,
      [type]: Math.max(0, value),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--color-bg-surface)] rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-bg-border)]">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold">Comp Breakdown</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--color-bg-border)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Show info */}
          <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
            <div className="text-sm font-medium">{showInfo.venue || 'TBD'}</div>
            <div className="text-xs text-[var(--color-text-muted)]">
              {showInfo.city} · {showInfo.date}
            </div>
          </div>

          {/* Product info */}
          <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium font-mono">{sku}</div>
              {size && <div className="text-xs text-[var(--color-text-muted)]">Size: {size}</div>}
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-purple-600">Total: {totalComps}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[var(--color-bg-border)] rounded-lg overflow-x-auto">
            {compTypes.map((type) => {
              const Icon = type.icon;
              const hasValue = compValues[type.value] > 0;
              return (
                <button
                  key={type.value}
                  onClick={() => setActiveTab(type.value)}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2 px-1.5 sm:px-2 rounded-md text-xs font-medium transition ${
                    activeTab === type.value
                      ? 'bg-[var(--color-bg-surface)] shadow-sm text-[var(--color-text-primary)]'
                      : hasValue
                        ? 'text-purple-600'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">{type.label}</span>
                  {hasValue && (
                    <span className="ml-0.5 text-[10px] bg-purple-100 text-purple-700 px-1 rounded flex-shrink-0">
                      {compValues[type.value]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active tab content */}
          <div className="border border-[var(--color-bg-border)] rounded-lg p-4">
            {compTypes
              .filter((type) => type.value === activeTab)
              .map((type) => {
                const Icon = type.icon;
                return (
                  <div key={type.value} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="font-medium">{type.label} Comps</div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          {type.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          handleValueChange(type.value, compValues[type.value] - 1)
                        }
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-[var(--color-bg-border)] hover:bg-[var(--color-bg-elevated)] text-lg"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={compValues[type.value]}
                        onChange={(e) =>
                          handleValueChange(type.value, parseInt(e.target.value, 10) || 0)
                        }
                        className="flex-1 px-3 py-2 text-center text-lg font-mono border border-[var(--color-bg-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="0"
                      />
                      <button
                        onClick={() =>
                          handleValueChange(type.value, compValues[type.value] + 1)
                        }
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-[var(--color-bg-border)] hover:bg-[var(--color-bg-elevated)] text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Summary */}
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs font-medium text-purple-800 mb-2">Comp Summary</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
              {compTypes.map((type) => (
                <div key={type.value}>
                  <div className="text-lg font-semibold text-purple-700">
                    {compValues[type.value]}
                  </div>
                  <div className="text-[10px] text-purple-600">{type.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-bg-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={2}
              placeholder="Recipients, reason, etc..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-[var(--color-bg-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--color-bg-border)] hover:bg-[var(--color-bg-elevated)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Comps'}
          </button>
        </div>
      </div>
    </div>
  );
}
