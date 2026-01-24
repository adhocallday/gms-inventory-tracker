'use client';

interface POLineItem {
  sku: string;
  description: string;
  size: string;
  quantity_ordered: number;
  unit_cost: number;
  line_total: number;
}

interface PackingListLineItem {
  sku: string;
  description: string;
  size: string;
  quantity_received: number;
}

interface SalesLineItem {
  sku: string;
  description: string;
  size: string;
  qty_sold: number;
  unit_price: number;
  gross_sales: number;
}

interface CompLineItem {
  comp_type: string;
  sku: string;
  description: string;
  size: string;
  quantity: number;
}

type LineItem = POLineItem | PackingListLineItem | SalesLineItem | CompLineItem;

interface LineItemsTableProps {
  docType: 'po' | 'packing-list' | 'sales-report' | 'settlement';
  lineItems: LineItem[];
  onChange: (lineItems: LineItem[]) => void;
  unknownSkus?: string[];
}

export default function LineItemsTable({
  docType,
  lineItems,
  onChange,
  unknownSkus = [],
}: LineItemsTableProps) {
  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate totals for PO and Sales
    if (docType === 'po' && (field === 'quantity_ordered' || field === 'unit_cost')) {
      const item = updated[index] as POLineItem;
      item.line_total = item.quantity_ordered * item.unit_cost;
    } else if (docType === 'sales-report' && (field === 'qty_sold' || field === 'unit_price')) {
      const item = updated[index] as SalesLineItem;
      item.gross_sales = item.qty_sold * item.unit_price;
    }

    onChange(updated);
  };

  const addLineItem = () => {
    let newItem: LineItem;
    switch (docType) {
      case 'po':
        newItem = {
          sku: '',
          description: '',
          size: 'One-Size',
          quantity_ordered: 0,
          unit_cost: 0,
          line_total: 0,
        };
        break;
      case 'packing-list':
        newItem = {
          sku: '',
          description: '',
          size: 'One-Size',
          quantity_received: 0,
        };
        break;
      case 'sales-report':
        newItem = {
          sku: '',
          description: '',
          size: 'One-Size',
          qty_sold: 0,
          unit_price: 0,
          gross_sales: 0,
        };
        break;
      case 'settlement':
        newItem = {
          comp_type: 'other',
          sku: '',
          description: '',
          size: 'One-Size',
          quantity: 0,
        };
        break;
    }
    onChange([...lineItems, newItem]);
  };

  const removeLineItem = (index: number) => {
    const updated = lineItems.filter((_, i) => i !== index);
    onChange(updated);
  };

  const isUnknownSku = (sku: string) => {
    return unknownSkus.includes(sku);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="g-panel space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold g-title">Line Items</h3>
        <button
          type="button"
          className="g-button text-sm px-3 py-2"
          onClick={addLineItem}
        >
          + Add Row
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm g-table">
          <thead>
            <tr className="border-b border-white/10">
              {docType === 'settlement' && <th className="text-left py-2 pr-2">Comp Type</th>}
              <th className="text-left py-2 pr-2">SKU</th>
              <th className="text-left py-2 pr-2">Description</th>
              <th className="text-left py-2 pr-2">Size</th>

              {docType === 'po' && (
                <>
                  <th className="text-right py-2 pr-2">Qty Ordered</th>
                  <th className="text-right py-2 pr-2">Unit Cost</th>
                  <th className="text-right py-2 pr-2">Line Total</th>
                </>
              )}

              {docType === 'packing-list' && (
                <th className="text-right py-2 pr-2">Qty Received</th>
              )}

              {docType === 'sales-report' && (
                <>
                  <th className="text-right py-2 pr-2">Qty Sold</th>
                  <th className="text-right py-2 pr-2">Unit Price</th>
                  <th className="text-right py-2 pr-2">Gross Sales</th>
                </>
              )}

              {docType === 'settlement' && (
                <th className="text-right py-2 pr-2">Quantity</th>
              )}

              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => (
              <tr key={index} className="border-b border-white/10">
                {/* Comp Type (Settlement only) */}
                {docType === 'settlement' && (
                  <td className="py-2 pr-2">
                    <select
                      className="w-32 g-input text-sm"
                      value={(item as CompLineItem).comp_type}
                      onChange={(e) =>
                        updateLineItem(index, 'comp_type', e.target.value)
                      }
                    >
                      <option value="band">Band</option>
                      <option value="global">Global</option>
                      <option value="show">Show</option>
                      <option value="trailer">Trailer</option>
                      <option value="other">Other</option>
                    </select>
                  </td>
                )}

                {/* SKU */}
                <td className="py-2 pr-2">
                  <input
                    className={`w-32 g-input text-sm ${
                      isUnknownSku(item.sku)
                        ? 'border-yellow-500 bg-yellow-500/10'
                        : ''
                    }`}
                    value={item.sku}
                    onChange={(e) =>
                      updateLineItem(index, 'sku', e.target.value)
                    }
                    placeholder="SKU"
                  />
                </td>

                {/* Description */}
                <td className="py-2 pr-2">
                  <input
                    className="w-48 g-input text-sm"
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(index, 'description', e.target.value)
                    }
                    placeholder="Description"
                  />
                </td>

                {/* Size */}
                <td className="py-2 pr-2">
                  <select
                    className="w-24 g-input text-sm"
                    value={item.size}
                    onChange={(e) =>
                      updateLineItem(index, 'size', e.target.value)
                    }
                  >
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="2XL">2XL</option>
                    <option value="3XL">3XL</option>
                    <option value="One-Size">One-Size</option>
                  </select>
                </td>

                {/* PO-specific columns */}
                {docType === 'po' && (
                  <>
                    <td className="py-2 pr-2 text-right">
                      <input
                        type="number"
                        className="w-24 g-input text-sm text-right"
                        value={(item as POLineItem).quantity_ordered}
                        onChange={(e) =>
                          updateLineItem(
                            index,
                            'quantity_ordered',
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        className="w-24 g-input text-sm text-right"
                        value={(item as POLineItem).unit_cost}
                        onChange={(e) =>
                          updateLineItem(
                            index,
                            'unit_cost',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-2 text-right text-[var(--g-text-dim)]">
                      {formatCurrency((item as POLineItem).line_total)}
                    </td>
                  </>
                )}

                {/* Packing List columns */}
                {docType === 'packing-list' && (
                  <td className="py-2 pr-2 text-right">
                    <input
                      type="number"
                      className="w-24 g-input text-sm text-right"
                      value={(item as PackingListLineItem).quantity_received}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          'quantity_received',
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </td>
                )}

                {/* Sales Report columns */}
                {docType === 'sales-report' && (
                  <>
                    <td className="py-2 pr-2 text-right">
                      <input
                        type="number"
                        className="w-24 g-input text-sm text-right"
                        value={(item as SalesLineItem).qty_sold}
                        onChange={(e) =>
                          updateLineItem(
                            index,
                            'qty_sold',
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        className="w-24 g-input text-sm text-right"
                        value={(item as SalesLineItem).unit_price}
                        onChange={(e) =>
                          updateLineItem(
                            index,
                            'unit_price',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="py-2 pr-2 text-right text-[var(--g-text-dim)]">
                      {formatCurrency((item as SalesLineItem).gross_sales)}
                    </td>
                  </>
                )}

                {/* Settlement columns */}
                {docType === 'settlement' && (
                  <td className="py-2 pr-2 text-right">
                    <input
                      type="number"
                      className="w-24 g-input text-sm text-right"
                      value={(item as CompLineItem).quantity}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          'quantity',
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </td>
                )}

                {/* Remove button */}
                <td className="py-2 text-center">
                  <button
                    type="button"
                    className="text-[var(--g-accent)] hover:text-[var(--g-accent-2)] text-sm"
                    onClick={() => removeLineItem(index)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lineItems.length === 0 && (
        <p className="text-center text-sm text-[var(--g-text-muted)] py-8">
          No line items. Click "+ Add Row" to add an item.
        </p>
      )}
    </div>
  );
}
