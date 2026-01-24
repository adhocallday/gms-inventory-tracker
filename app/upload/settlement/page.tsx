'use client';

import { useState } from 'react';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { useTours } from '@/hooks/useTours';
import { useShows } from '@/hooks/useShows';

interface CompLineItemForm {
  comp_type: string;
  sku: string;
  description?: string;
  size?: string;
  quantity: number;
  unit_retail_value?: number;
}

interface SettlementFormState {
  tour_id?: string;
  show_id?: string;
  show_date?: string;
  venue_name?: string;
  settlement_date?: string;
  currency: string;
  gross_sales_total?: number;
  sales_tax_total?: number;
  credit_card_fees?: number;
  venue_merch_fee?: number;
  other_fees?: number;
  refunds?: number;
  net_settlement_amount?: number;
  split_percent?: number;
  paid_to?: string;
  payment_method?: string;
  notes?: string;
  comps: CompLineItemForm[];
}

const emptyForm: SettlementFormState = {
  currency: 'USD',
  comps: []
};

export default function UploadSettlementPage() {
  const { tours, loading: toursLoading } = useTours();
  const [parsedDocumentId, setParsedDocumentId] = useState<string | null>(null);
  const [form, setForm] = useState<SettlementFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { shows } = useShows(form.tour_id);

  const hydrateForm = (data: any) => {
    const comps = (data?.comps || []).map((item: any) => ({
      comp_type: 'other',
      sku: item.sku || '',
      description: '',
      size: item.size || '',
      quantity: item.quantity ?? 0,
      unit_retail_value: 0
    }));

    setForm({
      tour_id: '',
      show_id: '',
      show_date: data?.showDate || '',
      venue_name: data?.venueName || '',
      settlement_date: '',
      currency: 'USD',
      gross_sales_total: data?.grossSales || 0,
      sales_tax_total: data?.salesTax || 0,
      credit_card_fees: data?.ccFees || 0,
      venue_merch_fee: 0,
      other_fees: 0,
      refunds: 0,
      net_settlement_amount: 0,
      split_percent: 0,
      paid_to: '',
      payment_method: '',
      notes: '',
      comps
    });
  };

  const updateComp = (index: number, field: keyof CompLineItemForm, value: any) => {
    setForm(prev => {
      const next = [...prev.comps];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, comps: next };
    });
  };

  const addComp = () => {
    setForm(prev => ({
      ...prev,
      comps: [...prev.comps, { comp_type: 'other', sku: '', description: '', size: '', quantity: 0 }]
    }));
  };

  const removeComp = (index: number) => {
    setForm(prev => ({
      ...prev,
      comps: prev.comps.filter((_, i) => i !== index)
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Settlement</h1>
        <p className="text-gray-600">Upload a settlement PDF, review data, and post.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <FileDropzone
          fileType="settlement"
          onParseComplete={(data, docId) => {
            setParsedDocumentId(docId ?? null);
            hydrateForm(data);
          }}
        />
      </div>

      {parsedDocumentId && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Settlement Review</h2>
            <div className="text-sm text-gray-500">Draft ID: {parsedDocumentId}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Tour</label>
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
            <div>
              <label className="text-sm font-medium text-gray-700">Show</label>
              <select
                className="mt-1 w-full rounded border-gray-300"
                value={form.show_id || ''}
                onChange={e => setForm(prev => ({ ...prev, show_id: e.target.value }))}
              >
                <option value="">Select show</option>
                {shows.map(show => (
                  <option key={show.id} value={show.id}>
                    {show.show_date} — {show.venue_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Show Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded border-gray-300"
                value={form.show_date || ''}
                onChange={e => setForm(prev => ({ ...prev, show_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Venue Name</label>
              <input
                className="mt-1 w-full rounded border-gray-300"
                value={form.venue_name || ''}
                onChange={e => setForm(prev => ({ ...prev, venue_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Settlement Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded border-gray-300"
                value={form.settlement_date || ''}
                onChange={e => setForm(prev => ({ ...prev, settlement_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Currency</label>
              <input
                className="mt-1 w-full rounded border-gray-300"
                value={form.currency}
                onChange={e => setForm(prev => ({ ...prev, currency: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Gross Sales Total</label>
              <input
                type="number"
                className="mt-1 w-full rounded border-gray-300"
                value={form.gross_sales_total || 0}
                onChange={e => setForm(prev => ({ ...prev, gross_sales_total: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Sales Tax Total</label>
              <input
                type="number"
                className="mt-1 w-full rounded border-gray-300"
                value={form.sales_tax_total || 0}
                onChange={e => setForm(prev => ({ ...prev, sales_tax_total: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Credit Card Fees</label>
              <input
                type="number"
                className="mt-1 w-full rounded border-gray-300"
                value={form.credit_card_fees || 0}
                onChange={e => setForm(prev => ({ ...prev, credit_card_fees: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Venue Merch Fee</label>
              <input
                type="number"
                className="mt-1 w-full rounded border-gray-300"
                value={form.venue_merch_fee || 0}
                onChange={e => setForm(prev => ({ ...prev, venue_merch_fee: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Other Fees</label>
              <input
                type="number"
                className="mt-1 w-full rounded border-gray-300"
                value={form.other_fees || 0}
                onChange={e => setForm(prev => ({ ...prev, other_fees: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Refunds / Chargebacks</label>
              <input
                type="number"
                className="mt-1 w-full rounded border-gray-300"
                value={form.refunds || 0}
                onChange={e => setForm(prev => ({ ...prev, refunds: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Net Settlement</label>
              <input
                type="number"
                className="mt-1 w-full rounded border-gray-300"
                value={form.net_settlement_amount || 0}
                onChange={e => setForm(prev => ({ ...prev, net_settlement_amount: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Split Percent</label>
              <input
                type="number"
                className="mt-1 w-full rounded border-gray-300"
                value={form.split_percent || 0}
                onChange={e => setForm(prev => ({ ...prev, split_percent: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Paid To</label>
              <input
                className="mt-1 w-full rounded border-gray-300"
                value={form.paid_to || ''}
                onChange={e => setForm(prev => ({ ...prev, paid_to: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Payment Method</label>
              <input
                className="mt-1 w-full rounded border-gray-300"
                value={form.payment_method || ''}
                onChange={e => setForm(prev => ({ ...prev, payment_method: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3">
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
              <h3 className="text-lg font-semibold text-gray-900">Comps</h3>
              <button
                type="button"
                onClick={addComp}
                className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200"
              >
                Add comp
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-gray-500">
                  <tr>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">SKU</th>
                    <th className="text-left py-2">Description</th>
                    <th className="text-left py-2">Size</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">Retail</th>
                    <th className="text-right py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.comps.map((item, index) => (
                    <tr key={`${item.sku}-${index}`} className="border-t">
                      <td className="py-2 pr-2">
                        <select
                          className="w-32 rounded border-gray-300"
                          value={item.comp_type}
                          onChange={e => updateComp(index, 'comp_type', e.target.value)}
                        >
                          <option value="band">band</option>
                          <option value="venue">venue</option>
                          <option value="label">label</option>
                          <option value="vip">vip</option>
                          <option value="promo">promo</option>
                          <option value="mgmt">mgmt</option>
                          <option value="other">other</option>
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-28 rounded border-gray-300"
                          value={item.sku}
                          onChange={e => updateComp(index, 'sku', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-48 rounded border-gray-300"
                          value={item.description || ''}
                          onChange={e => updateComp(index, 'description', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-20 rounded border-gray-300"
                          value={item.size || ''}
                          onChange={e => updateComp(index, 'size', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          className="w-20 rounded border-gray-300 text-right"
                          value={item.quantity}
                          onChange={e => updateComp(index, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          className="w-24 rounded border-gray-300 text-right"
                          value={item.unit_retail_value || 0}
                          onChange={e => updateComp(index, 'unit_retail_value', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeComp(index)}
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
                className="px-4 py-2 rounded bg-orange-600 hover:bg-orange-700 text-white text-sm"
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
