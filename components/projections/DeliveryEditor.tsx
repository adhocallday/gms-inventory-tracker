'use client';

import { useState } from 'react';
import { X, Truck, Plus, Minus } from 'lucide-react';

type DeliveryType = 'delivery' | 'return' | 'adjustment';

interface DeliveryEditorProps {
  tourId: string;
  showId: string;
  showInfo: {
    date: string;
    venue: string;
    city: string;
  };
  sku: string;
  size: string | null;
  onClose: () => void;
  onSave: () => void;
}

export function DeliveryEditor({
  tourId,
  showId,
  showInfo,
  sku,
  size,
  onClose,
  onSave,
}: DeliveryEditorProps) {
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (quantity === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/tours/${tourId}/deliveries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show_id: showId,
          sku,
          size,
          quantity,
          delivery_type: deliveryType,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save delivery');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save delivery:', error);
      alert('Failed to save delivery. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[var(--g-accent)]" />
            <h2 className="font-semibold">Add Delivery/Adjustment</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Show info */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm font-medium">{showInfo.venue || 'TBD'}</div>
            <div className="text-xs text-[var(--g-text-muted)]">
              {showInfo.city} · {showInfo.date}
            </div>
          </div>

          {/* Product info */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm font-medium font-mono">{sku}</div>
            {size && <div className="text-xs text-[var(--g-text-muted)]">Size: {size}</div>}
          </div>

          {/* Type selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="flex gap-2">
              {[
                { value: 'delivery', label: 'Delivery', icon: Plus },
                { value: 'return', label: 'Return', icon: Minus },
                { value: 'adjustment', label: 'Adjustment', icon: null },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setDeliveryType(option.value as DeliveryType)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg border text-sm ${
                      deliveryType === option.value
                        ? 'border-[var(--g-accent)] bg-[var(--g-accent)]/10 text-[var(--g-accent)]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--g-accent)] focus:border-transparent"
              placeholder="Enter quantity"
              min="0"
            />
            <p className="text-xs text-[var(--g-text-muted)] mt-1">
              {deliveryType === 'delivery' && 'Units being received at this show'}
              {deliveryType === 'return' && 'Units being sent back/returned'}
              {deliveryType === 'adjustment' && 'Positive = add stock, Negative = remove stock'}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--g-accent)] focus:border-transparent resize-none"
              rows={2}
              placeholder="PO number, vendor, reason for adjustment..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || quantity === 0}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--g-accent)] text-white hover:bg-[var(--g-accent-2)] disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
