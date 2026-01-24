'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { useTours } from '@/hooks/useTours';

interface SalesLineItemForm {
  sku: string;
  description?: string;
  size?: string;
  qty_sold: number;
  qty_comp?: number;
  unit_price: number;
  gross_sales: number;
  tax?: number;
  net_sales?: number;
}

interface SalesReportFormState {
  tour_id?: string;
  show_date: string;
  venue_name: string;
  city?: string;
  state?: string;
  country?: string;
  attendance?: number;
  report_source: string;
  currency: string;
  line_items: SalesLineItemForm[];
}

const emptyForm: SalesReportFormState = {
  show_date: '',
  venue_name: '',
  report_source: 'AtVenu',
  currency: 'USD',
  line_items: []
};

export default function UploadSalesReportPage() {
  return (
    <Suspense fallback={<div className="g-container py-12">Loading…</div>}>
      <UploadSalesReportPageContent />
    </Suspense>
  );
}

function UploadSalesReportPageContent() {
  const searchParams = useSearchParams();
  const reviewDocId = searchParams.get('docId');
  const { tours, loading: toursLoading } = useTours();
  const [parsedDocumentId, setParsedDocumentId] = useState<string | null>(null);
  const [form, setForm] = useState<SalesReportFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const lineTotal = useMemo(() => {
    return form.line_items.reduce((sum, item) => sum + (item.gross_sales || 0), 0);
  }, [form.line_items]);

  const hydrateForm = (data: any) => {
    const lineItems = (data?.lineItems || []).map((item: any) => ({
      sku: item.sku || '',
      description: item.description || '',
      size: item.size || '',
      qty_sold: item.sold ?? 0,
      qty_comp: 0,
      unit_price: item.unitPrice ?? 0,
      gross_sales: item.gross ?? (item.sold ?? 0) * (item.unitPrice ?? 0),
      tax: 0,
      net_sales: 0
    }));

    setForm({
      tour_id: '',
      show_date: data?.showDate || '',
      venue_name: data?.venueName || '',
      city: data?.city || '',
      state: data?.state || '',
      country: '',
      attendance: data?.attendance || 0,
      report_source: 'AtVenu',
      currency: 'USD',
      line_items: lineItems
    });
  };

  const updateLineItem = (index: number, field: keyof SalesLineItemForm, value: any) => {
    setForm(prev => {
      const next = [...prev.line_items];
      const updated = { ...next[index], [field]: value };
      if (field === 'qty_sold' || field === 'unit_price') {
        const qty = Number(updated.qty_sold || 0);
        const price = Number(updated.unit_price || 0);
        updated.gross_sales = qty * price;
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
        { sku: '', description: '', size: '', qty_sold: 0, qty_comp: 0, unit_price: 0, gross_sales: 0 }
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
        <h1 className="text-3xl font-semibold g-title mb-2">Upload Sales Report</h1>
        <p className="text-[var(--g-text-dim)]">Upload a sales report PDF, review data, and post.</p>
      </div>

      {!reviewDocId && (
        <div className="g-panel">
          <FileDropzone
            fileType="sales-report"
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
            <h2 className="text-xl font-semibold g-title">Sales Report Review</h2>
            <div className="text-sm text-[var(--g-text-muted)]">Draft ID: {parsedDocumentId}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="g-label">Tour</label>
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
            <div>
              <label className="g-label">Show Date</label>
              <input
                type="date"
                className="mt-1 g-input"
                value={form.show_date}
                onChange={e => setForm(prev => ({ ...prev, show_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">Venue Name</label>
              <input
                className="mt-1 g-input"
                value={form.venue_name}
                onChange={e => setForm(prev => ({ ...prev, venue_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">City</label>
              <input
                className="mt-1 g-input"
                value={form.city || ''}
                onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">State</label>
              <input
                className="mt-1 g-input"
                value={form.state || ''}
                onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
              />
            </div>
            <div>
              <label className="g-label">Attendance</label>
              <input
                type="number"
                className="mt-1 g-input"
                value={form.attendance || 0}
                onChange={e => setForm(prev => ({ ...prev, attendance: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="g-label">Report Source</label>
              <input
                className="mt-1 g-input"
                value={form.report_source}
                onChange={e => setForm(prev => ({ ...prev, report_source: e.target.value }))}
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
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold g-title">Sales Lines</h3>
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
                    <th className="text-right py-2">Qty Sold</th>
                    <th className="text-right py-2">Qty Comp</th>
                    <th className="text-right py-2">Unit Price</th>
                    <th className="text-right py-2">Gross</th>
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
                          value={item.qty_sold}
                          onChange={e => updateLineItem(index, 'qty_sold', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          className="w-24 g-input text-right"
                          value={item.qty_comp || 0}
                          onChange={e => updateLineItem(index, 'qty_comp', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          className="w-24 g-input text-right"
                          value={item.unit_price}
                          onChange={e => updateLineItem(index, 'unit_price', Number(e.target.value))}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          className="w-24 g-input text-right"
                          value={item.gross_sales}
                          onChange={e => updateLineItem(index, 'gross_sales', Number(e.target.value))}
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
              Total Gross: <span className="font-semibold">${lineTotal.toFixed(2)}</span>
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
