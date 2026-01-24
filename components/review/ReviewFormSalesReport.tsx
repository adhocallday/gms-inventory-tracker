'use client';

import { useMemo } from 'react';
import LineItemsTable from './LineItemsTable';

interface SalesLineItem {
  sku: string;
  description: string;
  size: string;
  qty_sold: number;
  unit_price: number;
  gross_sales: number;
}

interface SalesReportFormData {
  show_date: string;
  venue_name: string;
  city?: string;
  state?: string;
  attendance?: number;
  total_gross?: number;
  line_items: SalesLineItem[];
}

interface ReviewFormSalesReportProps {
  data: SalesReportFormData;
  onChange: (data: SalesReportFormData) => void;
  unknownSkus?: string[];
  readOnly?: boolean;
}

export default function ReviewFormSalesReport({
  data,
  onChange,
  unknownSkus = [],
  readOnly = false,
}: ReviewFormSalesReportProps) {
  const handleFieldChange = (field: keyof SalesReportFormData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleLineItemsChange = (lineItems: SalesLineItem[]) => {
    // Recalculate total gross
    const totalGross = lineItems.reduce((sum, item) => sum + item.gross_sales, 0);
    onChange({ ...data, line_items: lineItems, total_gross: totalGross });
  };

  const calculatedGross = useMemo(() => {
    return data.line_items.reduce((sum, item) => sum + item.gross_sales, 0);
  }, [data.line_items]);

  const reportedGross = data.total_gross || 0;
  const grossMismatch = Math.abs(calculatedGross - reportedGross) > 1.0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPerHead = () => {
    if (!data.attendance || data.attendance === 0) return 'N/A';
    return formatCurrency(calculatedGross / data.attendance);
  };

  return (
    <div className="space-y-6">
      {/* Sales Report Header Fields */}
      <div className="g-panel space-y-4">
        <h3 className="text-lg font-semibold g-title">Sales Report Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Show Date */}
          <div>
            <label className="g-label block mb-1">
              Show Date <span className="text-[var(--g-accent)]">*</span>
            </label>
            <input
              type="date"
              className="g-input"
              value={data.show_date || ''}
              onChange={(e) => handleFieldChange('show_date', e.target.value)}
              disabled={readOnly}
            />
          </div>

          {/* Venue Name */}
          <div>
            <label className="g-label block mb-1">
              Venue Name <span className="text-[var(--g-accent)]">*</span>
            </label>
            <input
              type="text"
              className="g-input"
              value={data.venue_name || ''}
              onChange={(e) => handleFieldChange('venue_name', e.target.value)}
              placeholder="Venue Name"
              disabled={readOnly}
            />
          </div>

          {/* City */}
          <div>
            <label className="g-label block mb-1">City</label>
            <input
              type="text"
              className="g-input"
              value={data.city || ''}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              placeholder="City"
              disabled={readOnly}
            />
          </div>

          {/* State */}
          <div>
            <label className="g-label block mb-1">State</label>
            <input
              type="text"
              className="g-input"
              value={data.state || ''}
              onChange={(e) => handleFieldChange('state', e.target.value)}
              placeholder="State (e.g., CA, NY)"
              maxLength={2}
              disabled={readOnly}
            />
          </div>

          {/* Attendance */}
          <div>
            <label className="g-label block mb-1">Attendance</label>
            <input
              type="number"
              className="g-input"
              value={data.attendance || ''}
              onChange={(e) => handleFieldChange('attendance', parseInt(e.target.value) || 0)}
              placeholder="0"
              disabled={readOnly}
            />
          </div>

          {/* Per Head (Calculated) */}
          <div>
            <label className="g-label block mb-1">Per Head</label>
            <div className="g-input bg-black/20 text-[var(--g-text-dim)] cursor-not-allowed">
              {formatPerHead()}
            </div>
          </div>

          {/* Total Gross (Calculated vs Reported) */}
          <div className="md:col-span-2">
            <label className="g-label block mb-1">Total Gross Sales</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--g-text-muted)] mb-1">Calculated (Line Items)</p>
                <div className={`g-input ${grossMismatch ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-black/20'} text-[var(--g-text-dim)] cursor-not-allowed`}>
                  {formatCurrency(calculatedGross)}
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--g-text-muted)] mb-1">Reported</p>
                <input
                  type="number"
                  step="0.01"
                  className={`g-input ${grossMismatch ? 'border-yellow-500/30' : ''}`}
                  value={data.total_gross || ''}
                  onChange={(e) => handleFieldChange('total_gross', parseFloat(e.target.value) || 0)}
                  disabled={readOnly}
                />
              </div>
            </div>
            {grossMismatch && (
              <p className="text-xs text-yellow-400 mt-2">
                ⚠️ Warning: Calculated total ({formatCurrency(calculatedGross)}) differs from reported total ({formatCurrency(reportedGross)}) by {formatCurrency(Math.abs(calculatedGross - reportedGross))}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      {!readOnly && (
        <LineItemsTable
          docType="sales-report"
          lineItems={data.line_items}
          onChange={handleLineItemsChange}
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
                  <th className="text-right py-2 pr-2">Qty Sold</th>
                  <th className="text-right py-2 pr-2">Unit Price</th>
                  <th className="text-right py-2 pr-2">Gross Sales</th>
                </tr>
              </thead>
              <tbody>
                {data.line_items.map((item, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="py-2 pr-2">{item.sku}</td>
                    <td className="py-2 pr-2">{item.description}</td>
                    <td className="py-2 pr-2">{item.size}</td>
                    <td className="py-2 pr-2 text-right">{item.qty_sold}</td>
                    <td className="py-2 pr-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2 pr-2 text-right">{formatCurrency(item.gross_sales)}</td>
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
