/**
 * Parser Type Definitions
 *
 * @module parsers/types
 * @version 1.0.0
 */

// Sales Report Types
export interface SalesLineItem {
  sku: string;
  description: string;
  size: string;
  sold: number;
  unitPrice: number;
  gross: number;
}

export interface SalesReportData {
  showDate: string;
  venueName: string;
  city?: string;
  state?: string;
  attendance?: number;
  totalGross: number;
  lineItems: SalesLineItem[];
}

// Purchase Order Types
export interface POLineItem {
  sku: string;
  description: string;
  size: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface PurchaseOrderData {
  poNumber: string;
  vendor: string;
  orderDate: string;
  expectedDelivery?: string;
  lineItems: POLineItem[];
  totalAmount: number;
}

// Packing List Types
export interface PackingListLineItem {
  sku: string;
  description: string;
  size: string;
  quantityReceived: number;
}

export interface PackingListData {
  deliveryNumber?: string;
  poNumber: string;
  receivedDate: string;
  lineItems: PackingListLineItem[];
}

// Settlement Types
export interface SettlementComp {
  sku: string;
  description: string;
  size: string;
  quantity: number;
}

export interface SettlementReportData {
  showDate: string;
  venueName: string;
  grossSales: number;
  salesTax: number;
  ccFees: number;
  comps: SettlementComp[];
}

// Generic parsed document
export interface ParsedDocument {
  [key: string]: unknown;
}
