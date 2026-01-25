'use client';

import { useState } from 'react';
import { Check, X, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface TourProductCostEditorProps {
  tourProductId: string;
  sku: string;
  size: string;
  blankCost: number;
  printCost: number;
  fullPackageCost: number;
  suggestedRetail: number | null;
  inventoryBalance: number;
  isActive: boolean;
  onUpdate: (
    tourProductId: string,
    updates: { blank_unit_cost?: number; print_unit_cost?: number; suggested_retail?: number | null }
  ) => Promise<void>;
  onToggleActive: (tourProductId: string, isActive: boolean) => Promise<void>;
  onRemove: (tourProductId: string, sku: string, size: string) => Promise<void>;
}

export function TourProductCostEditor({
  tourProductId,
  sku,
  size,
  blankCost,
  printCost,
  fullPackageCost,
  suggestedRetail,
  inventoryBalance,
  isActive,
  onUpdate,
  onToggleActive,
  onRemove,
}: TourProductCostEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    blank_unit_cost: blankCost,
    print_unit_cost: printCost,
    suggested_retail: suggestedRetail ?? 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(tourProductId, {
        blank_unit_cost: editValues.blank_unit_cost,
        print_unit_cost: editValues.print_unit_cost,
        suggested_retail: editValues.suggested_retail || null,
      });
      setIsEditing(false);
    } catch (err) {
      // Error handled in parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValues({
      blank_unit_cost: blankCost,
      print_unit_cost: printCost,
      suggested_retail: suggestedRetail ?? 0,
    });
    setIsEditing(false);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return `$${value.toFixed(2)}`;
  };

  if (isEditing) {
    return (
      <tr className="bg-[var(--g-accent)]/5">
        <td className="py-2 pr-4">
          <span className="font-medium text-[var(--g-text)]">{size}</span>
        </td>
        <td className="py-2 pr-4 text-right">
          <input
            type="number"
            step="0.01"
            value={editValues.blank_unit_cost}
            onChange={(e) =>
              setEditValues({ ...editValues, blank_unit_cost: parseFloat(e.target.value) || 0 })
            }
            className="w-20 px-2 py-1 text-right bg-white/10 border border-white/20 rounded text-[var(--g-text)] focus:outline-none focus:ring-1 focus:ring-[var(--g-accent)]"
            disabled={isSaving}
          />
        </td>
        <td className="py-2 pr-4 text-right">
          <input
            type="number"
            step="0.01"
            value={editValues.print_unit_cost}
            onChange={(e) =>
              setEditValues({ ...editValues, print_unit_cost: parseFloat(e.target.value) || 0 })
            }
            className="w-20 px-2 py-1 text-right bg-white/10 border border-white/20 rounded text-[var(--g-text)] focus:outline-none focus:ring-1 focus:ring-[var(--g-accent)]"
            disabled={isSaving}
          />
        </td>
        <td className="py-2 pr-4 text-right text-[var(--g-text-dim)]">
          {formatCurrency(editValues.blank_unit_cost + editValues.print_unit_cost)}
        </td>
        <td className="py-2 pr-4 text-right">
          <input
            type="number"
            step="0.01"
            value={editValues.suggested_retail || ''}
            onChange={(e) =>
              setEditValues({ ...editValues, suggested_retail: parseFloat(e.target.value) || 0 })
            }
            className="w-20 px-2 py-1 text-right bg-white/10 border border-white/20 rounded text-[var(--g-text)] focus:outline-none focus:ring-1 focus:ring-[var(--g-accent)]"
            placeholder="-"
            disabled={isSaving}
          />
        </td>
        <td className="py-2 pr-4 text-right text-[var(--g-text-dim)]">{inventoryBalance}</td>
        <td className="py-2 pr-4 text-center">
          <Badge variant={isActive ? 'active' : 'default'} size="sm">
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </td>
        <td className="py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded transition"
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="p-1.5 text-[var(--g-text-muted)] hover:text-[var(--g-text)] hover:bg-white/10 rounded transition"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={!isActive ? 'opacity-50' : ''}>
      <td className="py-2 pr-4">
        <span className="font-medium text-[var(--g-text)]">{size}</span>
      </td>
      <td className="py-2 pr-4 text-right text-[var(--g-text)]">{formatCurrency(blankCost)}</td>
      <td className="py-2 pr-4 text-right text-[var(--g-text)]">{formatCurrency(printCost)}</td>
      <td className="py-2 pr-4 text-right font-medium text-[var(--g-text)]">
        {formatCurrency(fullPackageCost)}
      </td>
      <td className="py-2 pr-4 text-right text-[var(--g-text)]">
        {formatCurrency(suggestedRetail)}
      </td>
      <td className="py-2 pr-4 text-right text-[var(--g-text)]">{inventoryBalance}</td>
      <td className="py-2 pr-4 text-center">
        <button onClick={() => onToggleActive(tourProductId, isActive)}>
          <Badge
            variant={isActive ? 'active' : 'default'}
            size="sm"
            className="cursor-pointer hover:opacity-80 transition"
          >
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </button>
      </td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-[var(--g-text-muted)] hover:text-[var(--g-text)] hover:bg-white/10 rounded transition"
            title="Edit costs"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {inventoryBalance === 0 && (
            <button
              onClick={() => onRemove(tourProductId, sku, size)}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition"
              title="Remove from tour"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
