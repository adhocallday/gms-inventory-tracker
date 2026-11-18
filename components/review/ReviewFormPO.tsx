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
        <h3 className="text-lg font-semibold">Purchase order details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PO Number */}
          <div>
            <label htmlFor="review-po-number" className="g-label block mb-1">
              PO number <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="review-po-number"
              type="text"
              className="g-input"
              value={data.po_number || ''}
              onChange={(e) => handleFieldChange('po_number', e.target.value)}
              placeholder="PO number"
              disabled={readOnly}
            />
          </div>

          {/* Vendor */}
          <div>
            <label htmlFor="review-vendor" className="g-label block mb-1">
              Vendor <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="review-vendor"
              type="text"
              className="g-input"
              value={data.vendor || ''}
              onChange={(e) => handleFieldChange('vendor', e.target.value)}
              placeholder="Vendor name"
              disabled={readOnly}
            />
          </div>

          {/* Order Date */}
          <div>
            <label htmlFor="review-order-date" className="g-label block mb-1">
              Order date <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="review-order-date"
              type="date"
              className="g-input"
              value={data.order_date || ''}
              onChange={(e) => handleFieldChange('order_date', e.target.value)}
              disabled={readOnly}
            />
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label htmlFor="review-expected-delivery-date" className="g-label block mb-1">Expected delivery date</label>
            <input
              id="review-expected-delivery-date"
              type="date"
              className="g-input"
              value={data.expected_delivery_date || ''}
              onChange={(e) => handleFieldChange('expected_delivery_date', e.target.value)}
              disabled={readOnly}
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="review-po-status" className="g-label block mb-1">PO status</label>
            <select
              id="review-po-status"
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
            <p className="g-label block mb-1">Total amount</p>
            <div className="g-input bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] cursor-default tabular-nums" aria-readonly="true">
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
          <h3 className="text-lg font-semibold mb-4">Line items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm g-table">
              <thead>
                <tr className="border-b border-[var(--color-bg-border)]">
                  <th className="text-left py-2 pr-2">SKU</th>
                  <th className="text-left py-2 pr-2">Description</th>
                  <th className="text-left py-2 pr-2">Size</th>
                  <th className="text-right py-2 pr-2">Qty ordered</th>
                  <th className="text-right py-2 pr-2">Unit cost</th>
                  <th className="text-right py-2 pr-2">Line total</th>
                </tr>
              </thead>
              <tbody>
                {data.line_items.map((item, index) => (
                  <tr key={index} className="border-b border-[var(--color-bg-border)]">
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
