'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Edit2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type DocType = 'po' | 'packing-list' | 'sales-report' | 'settlement';

interface InlineDraftReviewProps {
  parsedDocumentId: string;
  docType: DocType;
  normalizedJson: any;
  validation: {
    missing_fields: string[];
    warnings: string[];
  };
  matching?: string[];
  onClose: () => void;
  onPosted?: () => void;
}

export function InlineDraftReview({
  parsedDocumentId,
  docType,
  normalizedJson,
  validation,
  matching = [],
  onClose,
  onPosted,
}: InlineDraftReviewProps) {
  const router = useRouter();
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccess, setPostSuccess] = useState(false);
  const [showLineItems, setShowLineItems] = useState(true);
  const [editedData, setEditedData] = useState(normalizedJson);

  const hasErrors = validation.missing_fields.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  const lineItems = useMemo(() => {
    if (docType === 'settlement') {
      return editedData?.comps ?? [];
    }
    return editedData?.line_items ?? [];
  }, [editedData, docType]);

  const handlePost = async () => {
    setIsPosting(true);
    setPostError(null);

    try {
      const response = await fetch(`/api/parsed-documents/${parsedDocumentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post',
          ui_overrides: editedData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to post document');
      }

      setPostSuccess(true);
      if (onPosted) onPosted();
    } catch (error: any) {
      setPostError(error.message);
    } finally {
      setIsPosting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (postSuccess) {
    return (
      <div className="bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--color-bg-surface)] shadow-inner">
            <Check className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-800">Document Posted Successfully</h3>
            <p className="text-sm text-emerald-600">
              The data has been added to the database.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline">
            Upload Another
          </Button>
          <Button onClick={() => router.push(`/dashboard/parsed-documents/${parsedDocumentId}`)}>
            View Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-bg-border)] bg-[var(--color-bg-elevated)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasErrors ? 'bg-red-100' : 'bg-emerald-100'}`}>
              {hasErrors ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : (
                <Check className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">
                {docType === 'sales-report' && 'Sales Report'}
                {docType === 'po' && 'Purchase Order'}
                {docType === 'packing-list' && 'Packing List'}
                {docType === 'settlement' && 'Settlement Report'}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Review and post to database
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-bg-border)] rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Validation Messages */}
      {(hasErrors || hasWarnings) && (
        <div className="p-4 space-y-2 border-b border-[var(--color-bg-border)]">
          {validation.missing_fields.map((field) => (
            <div key={field} className="flex items-center gap-2 text-sm text-red-600">
              <X className="w-3 h-3" />
              <span>Missing: {field.replace('_', ' ')}</span>
            </div>
          ))}
          {validation.warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-amber-600">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Matching Info */}
      {matching.length > 0 && (
        <div className="p-4 bg-blue-50/50 border-b border-[var(--color-bg-border)]">
          <p className="text-xs text-blue-700 font-medium mb-1">Auto-matched:</p>
          {matching.map((m, i) => (
            <p key={i} className="text-xs text-blue-600">{m}</p>
          ))}
        </div>
      )}

      {/* Summary Fields */}
      <div className="p-4 space-y-3">
        {/* Show-specific fields */}
        {(docType === 'sales-report' || docType === 'settlement') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Date</label>
              <input
                type="date"
                value={editedData?.show_date || ''}
                onChange={(e) => setEditedData({ ...editedData, show_date: e.target.value })}
                className="g-input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Venue</label>
              <input
                type="text"
                value={editedData?.venue_name || ''}
                onChange={(e) => setEditedData({ ...editedData, venue_name: e.target.value })}
                className="g-input w-full text-sm"
              />
            </div>
          </div>
        )}

        {/* Sales report totals */}
        {docType === 'sales-report' && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Attendance</label>
              <input
                type="number"
                value={editedData?.attendance || ''}
                onChange={(e) => setEditedData({ ...editedData, attendance: Number(e.target.value) })}
                className="g-input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Total Gross</label>
              <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                {formatCurrency(editedData?.total_gross || 0)}
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Line Items</label>
              <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                {lineItems.length}
              </div>
            </div>
          </div>
        )}

        {/* PO fields */}
        {docType === 'po' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">PO Number</label>
              <input
                type="text"
                value={editedData?.po_number || ''}
                onChange={(e) => setEditedData({ ...editedData, po_number: e.target.value })}
                className="g-input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Vendor</label>
              <input
                type="text"
                value={editedData?.vendor || ''}
                onChange={(e) => setEditedData({ ...editedData, vendor: e.target.value })}
                className="g-input w-full text-sm"
              />
            </div>
          </div>
        )}

        {/* Line Items Toggle */}
        <button
          onClick={() => setShowLineItems(!showLineItems)}
          className="flex items-center justify-between w-full p-2 bg-[var(--color-bg-elevated)] rounded-lg hover:bg-[var(--color-bg-border)] transition"
        >
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {docType === 'settlement' ? 'Comps' : 'Line Items'} ({lineItems.length})
          </span>
          {showLineItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Line Items Table */}
        {showLineItems && lineItems.length > 0 && (
          <div className="max-h-48 overflow-y-auto border border-[var(--color-bg-border)] rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-[var(--color-bg-elevated)] sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium">SKU</th>
                  <th className="text-left p-2 font-medium">Size</th>
                  <th className="text-right p-2 font-medium">
                    {docType === 'settlement' ? 'Qty' : 'Sold'}
                  </th>
                  {docType !== 'settlement' && (
                    <th className="text-right p-2 font-medium">Gross</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item: any, i: number) => (
                  <tr key={i} className="border-t border-[var(--color-bg-border)]">
                    <td className="p-2 font-mono">{item.sku}</td>
                    <td className="p-2">{item.size || '-'}</td>
                    <td className="p-2 text-right">
                      {item.qty_sold ?? item.quantity ?? 0}
                    </td>
                    {docType !== 'settlement' && (
                      <td className="p-2 text-right">
                        {formatCurrency(item.gross_sales ?? item.line_total ?? 0)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error Message */}
      {postError && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {postError}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-[var(--color-bg-border)] bg-[var(--color-bg-elevated)] flex gap-2">
        <Button
          onClick={() => router.push(`/dashboard/parsed-documents/${parsedDocumentId}`)}
          variant="outline"
          className="flex-1"
        >
          <Edit2 className="w-4 h-4 mr-2" />
          Full Edit
        </Button>
        <Button
          onClick={handlePost}
          disabled={isPosting || hasErrors}
          className="flex-1"
        >
          {isPosting ? 'Posting...' : 'Post to Database'}
        </Button>
      </div>
    </div>
  );
}
