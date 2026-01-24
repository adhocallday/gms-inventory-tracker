'use client';

import { useState, useEffect } from 'react';
import LineItemsTable from './LineItemsTable';

interface PackingListLineItem {
  sku: string;
  description: string;
  size: string;
  quantity_received: number;
}

interface PackingListFormData {
  delivery_number: string;
  po_number: string;
  received_date: string;
  received_location: string;
  received_by: string;
  line_items: PackingListLineItem[];
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor: string;
  order_date: string;
}

interface ReviewFormPackingListProps {
  data: PackingListFormData;
  onChange: (data: PackingListFormData) => void;
  tourId?: string;
  unknownSkus?: string[];
  readOnly?: boolean;
}

export default function ReviewFormPackingList({
  data,
  onChange,
  tourId,
  unknownSkus = [],
  readOnly = false,
}: ReviewFormPackingListProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(false);

  // Fetch purchase orders for the selected tour
  useEffect(() => {
    async function fetchPOs() {
      if (!tourId) {
        setPurchaseOrders([]);
        return;
      }

      setLoadingPOs(true);
      try {
        const res = await fetch(`/api/tours/${tourId}/purchase-orders`);
        if (res.ok) {
          const poData = await res.json();
          setPurchaseOrders(poData || []);
        }
      } catch (err) {
        console.error('Failed to fetch purchase orders:', err);
        setPurchaseOrders([]);
      } finally {
        setLoadingPOs(false);
      }
    }

    fetchPOs();
  }, [tourId]);

  const handleFieldChange = (field: keyof PackingListFormData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleLineItemsChange = (lineItems: PackingListLineItem[]) => {
    onChange({ ...data, line_items: lineItems });
  };

  return (
    <div className="space-y-6">
      {/* Packing List Header Fields */}
      <div className="g-panel space-y-4">
        <h3 className="text-lg font-semibold g-title">Packing List Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Delivery Number */}
          <div>
            <label className="g-label block mb-1">
              Delivery Number <span className="text-[var(--g-accent)]">*</span>
            </label>
            <input
              type="text"
              className="g-input"
              value={data.delivery_number || ''}
              onChange={(e) => handleFieldChange('delivery_number', e.target.value)}
              placeholder="Delivery Number"
              disabled={readOnly}
            />
          </div>

          {/* PO Number */}
          <div>
            <label className="g-label block mb-1">
              PO Number <span className="text-[var(--g-accent)]">*</span>
            </label>
            {tourId && purchaseOrders.length > 0 ? (
              <select
                className="g-input"
                value={data.po_number || ''}
                onChange={(e) => handleFieldChange('po_number', e.target.value)}
                disabled={readOnly || loadingPOs}
              >
                <option value="">
                  {loadingPOs ? 'Loading POs...' : 'Select a PO...'}
                </option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.po_number}>
                    {po.po_number} - {po.vendor}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="g-input"
                value={data.po_number || ''}
                onChange={(e) => handleFieldChange('po_number', e.target.value)}
                placeholder="PO Number"
                disabled={readOnly}
              />
            )}
            {!tourId && (
              <p className="text-xs text-yellow-400 mt-1">
                Select a tour above to choose from existing POs
              </p>
            )}
          </div>

          {/* Received Date */}
          <div>
            <label className="g-label block mb-1">
              Received Date <span className="text-[var(--g-accent)]">*</span>
            </label>
            <input
              type="date"
              className="g-input"
              value={data.received_date || ''}
              onChange={(e) => handleFieldChange('received_date', e.target.value)}
              disabled={readOnly}
            />
          </div>

          {/* Received Location */}
          <div>
            <label className="g-label block mb-1">
              Received Location <span className="text-[var(--g-accent)]">*</span>
            </label>
            <input
              type="text"
              className="g-input"
              value={data.received_location || ''}
              onChange={(e) => handleFieldChange('received_location', e.target.value)}
              placeholder="e.g., Warehouse, Venue"
              disabled={readOnly}
            />
          </div>

          {/* Received By */}
          <div className="md:col-span-2">
            <label className="g-label block mb-1">
              Received By <span className="text-[var(--g-accent)]">*</span>
            </label>
            <input
              type="text"
              className="g-input"
              value={data.received_by || ''}
              onChange={(e) => handleFieldChange('received_by', e.target.value)}
              placeholder="Person's Name"
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      {!readOnly && (
        <LineItemsTable
          docType="packing-list"
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
                  <th className="text-right py-2 pr-2">Qty Received</th>
                </tr>
              </thead>
              <tbody>
                {data.line_items.map((item, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="py-2 pr-2">{item.sku}</td>
                    <td className="py-2 pr-2">{item.description}</td>
                    <td className="py-2 pr-2">{item.size}</td>
                    <td className="py-2 pr-2 text-right">{item.quantity_received}</td>
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
