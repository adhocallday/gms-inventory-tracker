'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { useTours } from '@/hooks/useTours';

interface POLineItemForm {
  sku: string;
  description: string;
  size?: string;
  quantity_ordered: number;
  unit_cost: number;
  line_total: number;
  cost_type?: string;
  uom?: string;
  vendor_item_code?: string;
}

interface POFormState {
  po_number: string;
  vendor: string;
  order_date?: string;
  expected_delivery_date?: string;
  currency: string;
  ship_to_location?: string;
  notes?: string;
  tour_id?: string;
  line_items: POLineItemForm[];
  total_amount?: number;
}

const emptyForm: POFormState = {
  po_number: '',
  vendor: '',
  currency: 'USD',
  line_items: []
};

export default function UploadPOPage() {
  return (
    <Suspense fallback={<div className="g-container py-12">Loading…</div>}>
      <UploadPOPageContent />
    </Suspense>
  );
}

function UploadPOPageContent() {
  const searchParams = useSearchParams();
  const reviewDocId = searchParams.get('docId');
  const { tours, loading: toursLoading } = useTours();
  const [parsedDocumentId, setParsedDocumentId] = useState<string | null>(null);
  const [form, setForm] = useState<POFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const lineTotal = useMemo(() => {
    return form.line_items.reduce((sum, item) => sum + (item.line_total || 0), 0);
  }, [form.line_items]);

  const hydrateForm = (data: any) => {
    const lineItems = (data?.lineItems || []).map((item: any) => ({
      sku: item.sku || '',
      description: item.description || '',
      size: item.size || '',
      quantity_ordered: item.quantity ?? 0,
      unit_cost: item.unitCost ?? 0,
      line_total: item.total ?? (item.quantity ?? 0) * (item.unitCost ?? 0),
      cost_type: '',
      uom: 'ea',
      vendor_item_code: ''
    }));

    setForm({
      po_number: data?.poNumber || '',
      vendor: data?.vendor || '',
      order_date: data?.orderDate || '',
      expected_delivery_date: data?.expectedDelivery || '',
      currency: 'USD',
      ship_to_location: '',
      notes: '',
      tour_id: '',
      line_items: lineItems,
      total_amount: data?.totalAmount || 0
    });
  };

  const updateLineItem = (index: number, field: keyof POLineItemForm, value: any) => {
    setForm(prev => {
      const next = [...prev.line_items];
      const updated = { ...next[index], [field]: value };

      if (field === 'quantity_ordered' || field === 'unit_cost') {
        const qty = Number(updated.quantity_ordered || 0);
        const cost = Number(updated.unit_cost || 0);
        updated.line_total = qty * cost;
      }

      next[index] = updated;
      return { ...prev, line_items: next };
    });
  };

  const addLineItem = () => {
    setForm(prev => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        {
          sku: '',
          description: '',
          size: '',
          quantity_ordered: 0,
          unit_cost: 0,
          line_total: 0,
          cost_type: '',
          uom: 'ea',
          vendor_item_code: ''
        }
      ]
    }));
  };

  const removeLineItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }));
  };

  const saveDraft = async () => {
    if (!parsedDocumentId) return;
    setSaving(true);
    setStatusMessage(null);
    const response = await fetch(`/api/parsed-documents/${parsedDocumentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ui_overrides: form })
    });

    setSaving(false);
    if (!response.ok) {
      const data = await response.json();
      setStatusMessage(data.error || 'Failed to save draft');
      return;
    }
    setStatusMessage('Draft saved.');
  };

  const approveAndPost = async () => {
    if (!parsedDocumentId) return;
    setPosting(true);
    setStatusMessage(null);

    await fetch(`/api/parsed-documents/${parsedDocumentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ui_overrides: form, status: 'approved' })
    });

    const response = await fetch(`/api/parsed-documents/${parsedDocumentId}/post`, {
      method: 'POST'
    });

    setPosting(false);
    if (!response.ok) {
      const data = await response.json();
      setStatusMessage(data.error || 'Failed to post document');
      return;
    }
    setStatusMessage('Posted successfully.');
  };

  useEffect(() => {
    if (!reviewDocId) return;

    const loadDoc = async () => {
      const response = await fetch(`/api/parsed-documents/${reviewDocId}`);
      if (!response.ok) return;
      const data = await response.json();
      setParsedDocumentId(reviewDocId);
      if (data?.parsedDocument?.ui_overrides) {
        setForm(data.parsedDocument.ui_overrides);
        return;
      }
      hydrateForm(data?.parsedDocument?.normalized_json);
    };

    loadDoc();
  }, [reviewDocId]);

  return (
    <div className="g-container py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold g-title mb-2">
          Upload Purchase Order
        </h1>
        <p className="text-[var(--g-text-dim)]">
          Upload a PO PDF, review extracted data, and post to the database.
        </p>
      </div>

      {!reviewDocId && (
        <div className="g-panel">
          <FileDropzone
            fileType="po"
            onParseComplete={(data, docId) => {
              setParsedDocumentId(docId ?? null);
              hydrateForm(data);
            }}
          />
        </div>
      )}

      {parsedDocumentId && (
        <div className="g-panel space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold g-title">PO Review</h2>
            <div className="text-sm text-[var(--g-text-muted)]">Draft ID: {parsedDocumentId}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="g-label">PO Number</label>
              <input
                className="mt-1 g-input"
                value={form.po_number}
                onChange={e => setForm(prev => ({ ...prev, po_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">Vendor / Supplier</label>
              <input
                className="mt-1 g-input"
                value={form.vendor}
                onChange={e => setForm(prev => ({ ...prev, vendor: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">Order Date</label>
              <input
                type="date"
                className="mt-1 g-input"
                value={form.order_date || ''}
                onChange={e => setForm(prev => ({ ...prev, order_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">Expected Delivery</label>
              <input
                type="date"
                className="mt-1 g-input"
                value={form.expected_delivery_date || ''}
                onChange={e => setForm(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">Currency</label>
              <input
                className="mt-1 g-input"
                value={form.currency}
                onChange={e => setForm(prev => ({ ...prev, currency: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">Ship To Location</label>
              <input
                className="mt-1 g-input"
                value={form.ship_to_location || ''}
                onChange={e => setForm(prev => ({ ...prev, ship_to_location: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="g-label">Match to Tour</label>
              <select
                className="mt-1 g-input"
                value={form.tour_id || ''}
                onChange={e => setForm(prev => ({ ...prev, tour_id: e.target.value }))}
              >
                <option value="">{toursLoading ? 'Loading tours...' : 'Select tour'}</option>
                {tours.map(tour => (
                  <option key={tour.id} value={tour.id}>
                    {tour.artist} — {tour.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="g-label">Notes</label>
              <textarea
                className="mt-1 g-input"
                rows={3}
                value={form.notes || ''}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold g-title">Line Items</h3>
              <button
                type="button"
                onClick={addLineItem}
                className="g-button g-button-outline text-xs"
              >
                Add line
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm g-table">
                <thead className="g-kicker">
                  <tr>
                    <th className="text-left py-2">SKU</th>
                    <th className="text-left py-2">Description</th>
                    <th className="text-left py-2">Size</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">Unit Cost</th>
                    <th className="text-right py-2">Line Total</th>
                    <th className="text-left py-2">Cost Type</th>
                    <th className="text-left py-2">UOM</th>
                    <th className="text-left py-2">Vendor Item</th>
                    <th className="text-right py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.line_items.map((item, index) => (
                    <tr key={`${item.sku}-${index}`} className="border-t">
                      <td className="py-2 pr-2">
                        <input
                          className="w-28 g-input"
                          value={item.sku}
                          onChange={e => updateLineItem(index, 'sku', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-56 g-input"
                          value={item.description}
                          onChange={e => updateLineItem(index, 'description', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-20 g-input"
                          value={item.size || ''}
                          onChange={e => updateLineItem(index, 'size', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          className="w-24 g-input text-right"
                          value={item.quantity_ordered}
                          onChange={e => updateLineItem(index, 'quantity_ordered', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          className="w-24 g-input text-right"
                          value={item.unit_cost}
                          onChange={e => updateLineItem(index, 'unit_cost', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          className="w-24 g-input text-right"
                          value={item.line_total}
                          onChange={e => updateLineItem(index, 'line_total', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-28 g-input"
                          value={item.cost_type || ''}
                          onChange={e => updateLineItem(index, 'cost_type', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-16 g-input"
                          value={item.uom || ''}
                          onChange={e => updateLineItem(index, 'uom', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-28 g-input"
                          value={item.vendor_item_code || ''}
                          onChange={e => updateLineItem(index, 'vendor_item_code', e.target.value)}
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-[var(--g-accent)] hover:text-[var(--g-accent-2)] text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-right text-sm text-[var(--g-text-dim)]">
              Line Total: <span className="font-semibold">${lineTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-[var(--g-text-dim)]">{statusMessage}</div>
            <div className="space-x-3">
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving}
                className="g-button g-button-outline"
              >
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={approveAndPost}
                disabled={posting}
                className="g-button"
              >
                {posting ? 'Posting…' : 'Approve & Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
