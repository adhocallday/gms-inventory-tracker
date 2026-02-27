'use client';

import { useMemo } from 'react';
import LineItemsTable from './LineItemsTable';

interface POLineItem {
  sku: string;
  description: string;
  size: string;
  quantity_ordered: number;
  unit_cost: number;
  line_total: number;
}

interface POFormData {
  po_number: string;
  vendor: string;
  order_date: string;
  expected_delivery_date?: string;
  status?: string;
  line_items: POLineItem[];
  total_amount?: number;
}

interface ReviewFormPOProps {
  data: POFormData;
  onChange: (data: POFormData) => void;
  unknownSkus?: string[];
  readOnly?: boolean;
}

export default function ReviewFormPO({
  data,
  onChange,
  unknownSkus = [],
  readOnly = false,
}: ReviewFormPOProps) {
  const handleFieldChange = (field: keyof POFormData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleLineItemsChange = (lineItems: POLineItem[]) => {
    // Recalculate total
    const totalAmount = lineItems.reduce((sum, item) => sum + item.line_total, 0);
    onChange({ ...data, line_items: lineItems, total_amount: totalAmount });
  };

  const totalAmount = useMemo(() => {
    return data.line_items.reduce((sum, item) => sum + item.line_total, 0);
  }, [data.line_items]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* PO Header Fields */}
      <div className="g-panel space-y-4">
        <h3 className="text-lg font-semibold g-title">Purchase Order Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PO Number */}
          <div>
            <label className="g-label block mb-1">
              PO Number <span className="text-[var(--color-red-primary)]">*</span>
            </label>
            <input
              type="text"
              className="g-input"
              value={data.po_number || ''}
              onChange={(e) => handleFieldChange('po_number', e.target.value)}
              placeholder="PO Number"
              disabled={readOnly}
            />
          </div>

          {/* Vendor */}
          <div>
            <label className="g-label block mb-1">
              Vendor <span className="text-[var(--color-red-primary)]">*</span>
            </label>
            <input
              type="text"
              className="g-input"
              value={data.vendor || ''}
              onChange={(e) => handleFieldChange('vendor', e.target.value)}
              placeholder="Vendor Name"
              disabled={readOnly}
            />
          </div>

          {/* Order Date */}
          <div>
            <label className="g-label block mb-1">
              Order Date <span className="text-[var(--color-red-primary)]">*</span>
            </label>
            <input
              type="date"
              className="g-input"
              value={data.order_date || ''}
              onChange={(e) => handleFieldChange('order_date', e.target.value)}
              disabled={readOnly}
            />
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label className="g-label block mb-1">Expected Delivery Date</label>
            <input
              type="date"
              className="g-input"
              value={data.expected_delivery_date || ''}
              onChange={(e) => handleFieldChange('expected_delivery_date', e.target.value)}
              disabled={readOnly}
            />
          </div>

          {/* Status */}
          <div>
            <label className="g-label block mb-1">PO Status</label>
            <select
              className="g-input"
              value={data.status || 'open'}
              onChange={(e) => handleFieldChange('status', e.target.value)}
              disabled={readOnly}
            >
              <option value="open">Open</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Total Amount (Read-only) */}
          <div>
            <label className="g-label block mb-1">Total Amount</label>
            <div className="g-input bg-black/20 text-[var(--color-text-secondary)] cursor-not-allowed">
              {formatCurrency(totalAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      {!readOnly && (
        <LineItemsTable
          docType="po"
          lineItems={data.line_items}
          onChange={(items) => handleLineItemsChange(items as POLineItem[])}
          unknownSkus={unknownSkus}
        />
      )}

      {readOnly && (
        <div className="g-panel">
          <h3 className="text-lg font-semibold g-title mb-4">Line Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm g-table">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-2">SKU</th>
                  <th className="text-left py-2 pr-2">Description</th>
                  <th className="text-left py-2 pr-2">Size</th>
                  <th className="text-right py-2 pr-2">Qty Ordered</th>
                  <th className="text-right py-2 pr-2">Unit Cost</th>
                  <th className="text-right py-2 pr-2">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {data.line_items.map((item, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="py-2 pr-2">{item.sku}</td>
                    <td className="py-2 pr-2">{item.description}</td>
                    <td className="py-2 pr-2">{item.size}</td>
                    <td className="py-2 pr-2 text-right">{item.quantity_ordered}</td>
                    <td className="py-2 pr-2 text-right">{formatCurrency(item.unit_cost)}</td>
                    <td className="py-2 pr-2 text-right">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
