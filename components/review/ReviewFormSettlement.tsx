'use client';

import LineItemsTable from './LineItemsTable';

interface CompLineItem {
  comp_type: string;
  sku: string;
  description: string;
  size: string;
  quantity: number;
}

interface SettlementFormData {
  show_date: string;
  venue_name: string;
  gross_sales_total: number;
  sales_tax_total: number;
  credit_card_fees: number;
  other_fees?: number;
  refunds?: number;
  net_settlement_amount?: number;
  comps: CompLineItem[];
}

interface ReviewFormSettlementProps {
  data: SettlementFormData;
  onChange: (data: SettlementFormData) => void;
  unknownSkus?: string[];
  readOnly?: boolean;
}

export default function ReviewFormSettlement({
  data,
  onChange,
  unknownSkus = [],
  readOnly = false,
}: ReviewFormSettlementProps) {
  const handleFieldChange = (field: keyof SettlementFormData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleCompsChange = (comps: CompLineItem[]) => {
    onChange({ ...data, comps });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const calculateNetSettlement = () => {
    const gross = data.gross_sales_total || 0;
    const tax = data.sales_tax_total || 0;
    const ccFees = data.credit_card_fees || 0;
    const otherFees = data.other_fees || 0;
    const refunds = data.refunds || 0;
    return gross - tax - ccFees - otherFees - refunds;
  };

  const netSettlement = calculateNetSettlement();

  return (
    <div className="space-y-6">
      <div className="g-panel space-y-4">
        <h3 className="text-lg font-semibold g-title">Settlement Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div>
            <label className="g-label block mb-1">
              Gross Sales Total <span className="text-[var(--g-accent)]">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              className="g-input"
              value={data.gross_sales_total || ''}
              onChange={(e) =>
                handleFieldChange('gross_sales_total', parseFloat(e.target.value) || 0)
              }
              disabled={readOnly}
            />
          </div>

          <div>
            <label className="g-label block mb-1">
              Sales Tax Total <span className="text-[var(--g-accent)]">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              className="g-input"
              value={data.sales_tax_total || ''}
              onChange={(e) =>
                handleFieldChange('sales_tax_total', parseFloat(e.target.value) || 0)
              }
              disabled={readOnly}
            />
          </div>

          <div>
            <label className="g-label block mb-1">
              Credit Card Fees <span className="text-[var(--g-accent)]">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              className="g-input"
              value={data.credit_card_fees || ''}
              onChange={(e) =>
                handleFieldChange('credit_card_fees', parseFloat(e.target.value) || 0)
              }
              disabled={readOnly}
            />
          </div>

          <div>
            <label className="g-label block mb-1">Other Fees</label>
            <input
              type="number"
              step="0.01"
              className="g-input"
              value={data.other_fees || ''}
              onChange={(e) =>
                handleFieldChange('other_fees', parseFloat(e.target.value) || 0)
              }
              placeholder="0.00"
              disabled={readOnly}
            />
          </div>

          <div>
            <label className="g-label block mb-1">Refunds</label>
            <input
              type="number"
              step="0.01"
              className="g-input"
              value={data.refunds || ''}
              onChange={(e) => handleFieldChange('refunds', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              disabled={readOnly}
            />
          </div>

          <div>
            <label className="g-label block mb-1">Net Settlement Amount</label>
            <div className="g-input bg-black/20 text-[var(--g-text-dim)] cursor-not-allowed">
              {formatCurrency(netSettlement)}
            </div>
          </div>
        </div>
      </div>

      <div className="g-card p-4 bg-black/20">
        <h4 className="text-sm font-semibold text-[var(--g-text-dim)] mb-3">
          Settlement Calculation
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--g-text-muted)]">Gross Sales:</span>
            <span className="text-[var(--g-text)]">{formatCurrency(data.gross_sales_total || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--g-text-muted)]">- Sales Tax:</span>
            <span className="text-red-300">-{formatCurrency(data.sales_tax_total || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--g-text-muted)]">- Credit Card Fees:</span>
            <span className="text-red-300">-{formatCurrency(data.credit_card_fees || 0)}</span>
          </div>
          {(data.other_fees || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--g-text-muted)]">- Other Fees:</span>
              <span className="text-red-300">-{formatCurrency(data.other_fees || 0)}</span>
            </div>
          )}
          {(data.refunds || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--g-text-muted)]">- Refunds:</span>
              <span className="text-red-300">-{formatCurrency(data.refunds || 0)}</span>
            </div>
          )}
          <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-semibold">
            <span className="text-[var(--g-text)]">Net Settlement:</span>
            <span className={netSettlement >= 0 ? 'text-green-300' : 'text-red-300'}>
              {formatCurrency(netSettlement)}
            </span>
          </div>
        </div>
      </div>

      {!readOnly && (
        <LineItemsTable
          docType="settlement"
          lineItems={data.comps}
          onChange={(items) => handleCompsChange(items as CompLineItem[])}
          unknownSkus={unknownSkus}
        />
      )}

      {readOnly && (
        <div className="g-panel">
          <h3 className="text-lg font-semibold g-title mb-4">Comps</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm g-table">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-2">Comp Type</th>
                  <th className="text-left py-2 pr-2">SKU</th>
                  <th className="text-left py-2 pr-2">Description</th>
                  <th className="text-left py-2 pr-2">Size</th>
                  <th className="text-right py-2 pr-2">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {data.comps.map((item, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="py-2 pr-2">{item.comp_type}</td>
                    <td className="py-2 pr-2">{item.sku}</td>
                    <td className="py-2 pr-2">{item.description}</td>
                    <td className="py-2 pr-2">{item.size}</td>
                    <td className="py-2 pr-2 text-right">{item.quantity}</td>
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
