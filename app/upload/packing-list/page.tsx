'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { useTours } from '@/hooks/useTours';

interface PackingLineItemForm {
  sku: string;
  description?: string;
  size?: string;
  quantity_received: number;
}

interface PackingListFormState {
  delivery_number: string;
  received_date: string;
  received_location: string;
  received_by: string;
  po_number: string;
  carrier?: string;
  tracking_number?: string;
  notes?: string;
  tour_id?: string;
  line_items: PackingLineItemForm[];
}

const emptyForm: PackingListFormState = {
  delivery_number: '',
  received_date: '',
  received_location: '',
  received_by: '',
  po_number: '',
  line_items: []
};

export default function UploadPackingListPage() {
  return (
    <Suspense fallback={<div className="g-container py-12">Loading…</div>}>
      <UploadPackingListPageContent />
    </Suspense>
  );
}

function UploadPackingListPageContent() {
  const searchParams = useSearchParams();
  const reviewDocId = searchParams.get('docId');
  const { tours, loading: toursLoading } = useTours();
  const [parsedDocumentId, setParsedDocumentId] = useState<string | null>(null);
  const [form, setForm] = useState<PackingListFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const hydrateForm = (data: any) => {
    const lineItems = (data?.lineItems || []).map((item: any) => ({
      sku: item.sku || '',
      description: item.description || '',
      size: item.size || '',
      quantity_received: item.quantityReceived ?? 0
    }));

    setForm({
      delivery_number: data?.deliveryNumber || '',
      received_date: data?.receivedDate || '',
      received_location: '',
      received_by: '',
      po_number: data?.poNumber || '',
      carrier: '',
      tracking_number: '',
      notes: '',
      tour_id: '',
      line_items: lineItems
    });
  };

  const updateLineItem = (index: number, field: keyof PackingLineItemForm, value: any) => {
    setForm(prev => {
      const next = [...prev.line_items];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, line_items: next };
    });
  };

  const addLineItem = () => {
    setForm(prev => ({
      ...prev,
      line_items: [...prev.line_items, { sku: '', description: '', size: '', quantity_received: 0 }]
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
    const response = await fetch(`/api/parsed-documents/${parsedDocumentId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ui_overrides: form })
      }
    );

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

    await fetch(`/api/parsed-documents/${parsedDocumentId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ui_overrides: form, status: 'approved' })
      }
    );

    const response = await fetch(`/api/parsed-documents/${parsedDocumentId}/post`, { method: 'POST' });

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
        <h1 className="text-3xl font-semibold g-title mb-2">Upload Packing List</h1>
        <p className="text-[var(--g-text-dim)]">Upload a packing list PDF, review extracted data, and post.</p>
      </div>

      {!reviewDocId && (
        <div className="g-panel">
          <FileDropzone
            fileType="packing-list"
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
            <h2 className="text-xl font-semibold g-title">Packing List Review</h2>
            <div className="text-sm text-[var(--g-text-muted)]">Draft ID: {parsedDocumentId}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="g-label">Delivery Number</label>
              <input
                className="mt-1 g-input"
                value={form.delivery_number}
                onChange={e => setForm(prev => ({ ...prev, delivery_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">PO Number</label>
              <input
                className="mt-1 g-input"
                value={form.po_number}
                onChange={e => setForm(prev => ({ ...prev, po_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">Received Date</label>
              <input
                type="date"
                className="mt-1 g-input"
                value={form.received_date}
                onChange={e => setForm(prev => ({ ...prev, received_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">Received Location</label>
              <input
                className="mt-1 g-input"
                value={form.received_location}
                onChange={e => setForm(prev => ({ ...prev, received_location: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">Received By</label>
              <input
                className="mt-1 g-input"
                value={form.received_by}
                onChange={e => setForm(prev => ({ ...prev, received_by: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">Carrier</label>
              <input
                className="mt-1 g-input"
                value={form.carrier || ''}
                onChange={e => setForm(prev => ({ ...prev, carrier: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">Tracking Number</label>
              <input
                className="mt-1 g-input"
                value={form.tracking_number || ''}
                onChange={e => setForm(prev => ({ ...prev, tracking_number: e.target.value }))}
              />
            </div>
            <div>
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
              <h3 className="text-lg font-semibold g-title">Items</h3>
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
                    <th className="text-right py-2">Qty Received</th>
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
                          value={item.description || ''}
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
                          value={item.quantity_received}
                          onChange={e => updateLineItem(index, 'quantity_received', Number(e.target.value))}
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
