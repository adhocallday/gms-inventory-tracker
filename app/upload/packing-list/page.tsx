'use client';

import { useState } from 'react';
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Packing List</h1>
        <p className="text-gray-600">Upload a packing list PDF, review extracted data, and post.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <FileDropzone
          fileType="packing-list"
          onParseComplete={(data, docId) => {
            setParsedDocumentId(docId ?? null);
            hydrateForm(data);
          }}
        />
      </div>

      {parsedDocumentId && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Packing List Review</h2>
            <div className="text-sm text-gray-500">Draft ID: {parsedDocumentId}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Delivery Number</label>
              <input
                className="mt-1 w-full rounded border-gray-300"
                value={form.delivery_number}
                onChange={e => setForm(prev => ({ ...prev, delivery_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">PO Number</label>
              <input
                className="mt-1 w-full rounded border-gray-300"
                value={form.po_number}
                onChange={e => setForm(prev => ({ ...prev, po_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Received Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded border-gray-300"
                value={form.received_date}
                onChange={e => setForm(prev => ({ ...prev, received_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Received Location</label>
              <input
                className="mt-1 w-full rounded border-gray-300"
                value={form.received_location}
                onChange={e => setForm(prev => ({ ...prev, received_location: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Received By</label>
              <input
                className="mt-1 w-full rounded border-gray-300"
                value={form.received_by}
                onChange={e => setForm(prev => ({ ...prev, received_by: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Carrier</label>
              <input
                className="mt-1 w-full rounded border-gray-300"
                value={form.carrier || ''}
                onChange={e => setForm(prev => ({ ...prev, carrier: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tracking Number</label>
              <input
                className="mt-1 w-full rounded border-gray-300"
                value={form.tracking_number || ''}
                onChange={e => setForm(prev => ({ ...prev, tracking_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Match to Tour</label>
              <select
                className="mt-1 w-full rounded border-gray-300"
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
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                className="mt-1 w-full rounded border-gray-300"
                rows={3}
                value={form.notes || ''}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Items</h3>
              <button
                type="button"
                onClick={addLineItem}
                className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200"
              >
                Add line
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-gray-500">
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
                          className="w-28 rounded border-gray-300"
                          value={item.sku}
                          onChange={e => updateLineItem(index, 'sku', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-56 rounded border-gray-300"
                          value={item.description || ''}
                          onChange={e => updateLineItem(index, 'description', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-20 rounded border-gray-300"
                          value={item.size || ''}
                          onChange={e => updateLineItem(index, 'size', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          className="w-24 rounded border-gray-300 text-right"
                          value={item.quantity_received}
                          onChange={e => updateLineItem(index, 'quantity_received', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-red-500 hover:text-red-700 text-xs"
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
            <div className="text-sm text-gray-600">{statusMessage}</div>
            <div className="space-x-3">
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving}
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
              >
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={approveAndPost}
                disabled={posting}
                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
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
