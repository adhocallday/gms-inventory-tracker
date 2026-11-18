'use client';

import LineItemsTable from './LineItemsTable';

interface CompLineItem {
  comp_category: 'band' | 'global';
  comp_source: 'show' | 'trailer';
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
        <h3 className="text-lg font-semibold">Settlement details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="review-show-date" className="g-label block mb-1">
              Show date <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="review-show-date"
              type="date"
              className="g-input"
              value={data.show_date || ''}
              onChange={(e) => handleFieldChange('show_date', e.target.value)}
              disabled={readOnly}
            />
          </div>

          <div>
            <label htmlFor="review-venue-name" className="g-label block mb-1">
              Venue name <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="review-venue-name"
              type="text"
              className="g-input"
              value={data.venue_name || ''}
              onChange={(e) => handleFieldChange('venue_name', e.target.value)}
              placeholder="Venue name"
              disabled={readOnly}
            />
          </div>

          <div>
            <label htmlFor="review-gross-sales-total" className="g-label block mb-1">
              Gross sales total <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="review-gross-sales-total"
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
            <label htmlFor="review-sales-tax-total" className="g-label block mb-1">
              Sales tax total <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="review-sales-tax-total"
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
            <label htmlFor="review-credit-card-fees" className="g-label block mb-1">
              Credit card fees <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="review-credit-card-fees"
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
            <label htmlFor="review-other-fees" className="g-label block mb-1">Other fees</label>
            <input
              id="review-other-fees"
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
            <label htmlFor="review-refunds" className="g-label block mb-1">Refunds</label>
            <input
              id="review-refunds"
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
            <p className="g-label block mb-1">Net settlement</p>
            <div className="g-input bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] cursor-default tabular-nums" aria-readonly="true">
              {formatCurrency(netSettlement)}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-bg-border)] p-4 bg-[var(--color-bg-elevated)]">
        <h4 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
          Settlement calculation
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">Gross sales:</span>
            <span className="text-[var(--color-text-primary)] tabular-nums">{formatCurrency(data.gross_sales_total || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">− Sales tax:</span>
            <span className="text-[var(--color-text-primary)] tabular-nums">−{formatCurrency(data.sales_tax_total || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">− Card fees:</span>
            <span className="text-[var(--color-text-primary)] tabular-nums">−{formatCurrency(data.credit_card_fees || 0)}</span>
          </div>
          {(data.other_fees || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">− Other fees:</span>
              <span className="text-[var(--color-text-primary)] tabular-nums">−{formatCurrency(data.other_fees || 0)}</span>
            </div>
          )}
          {(data.refunds || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">− Refunds:</span>
              <span className="text-[var(--color-text-primary)] tabular-nums">−{formatCurrency(data.refunds || 0)}</span>
            </div>
          )}
          <div className="border-t border-[var(--color-bg-border)] pt-2 mt-2 flex justify-between font-semibold">
            <span className="text-[var(--color-text-primary)]">Net settlement:</span>
            <span className={netSettlement >= 0 ? 'text-[var(--color-text-primary)] tabular-nums' : 'text-danger tabular-nums'}>
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
          <h3 className="text-lg font-semibold mb-4">Comps</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm g-table">
              <thead>
                <tr className="border-b border-[var(--color-bg-border)]">
                  <th className="text-left py-2 pr-2">Category</th>
                  <th className="text-left py-2 pr-2">Source</th>
                  <th className="text-left py-2 pr-2">Comp type</th>
                  <th className="text-left py-2 pr-2">SKU</th>
                  <th className="text-left py-2 pr-2">Description</th>
                  <th className="text-left py-2 pr-2">Size</th>
                  <th className="text-right py-2 pr-2">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {data.comps.map((item, index) => (
                  <tr key={index} className="border-b border-[var(--color-bg-border)]">
                    <td className="py-2 pr-2">{item.comp_category}</td>
                    <td className="py-2 pr-2">{item.comp_source}</td>
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
