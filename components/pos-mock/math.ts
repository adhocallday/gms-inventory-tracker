/**
 * Cart, tax, tip, change and settlement math for the POS mock.
 *
 * Ported from the iOS app (MerchFlow/Features/POS/ViewModels/CartViewModel.swift,
 * PaymentViewModel.swift, Onboarding/Views/DemoSettlementView.swift and
 * Reports/Views/ReconciliationView.swift). iOS uses Decimal with
 * `.rounded2` (round half up to cents); here every amount is integer cents,
 * so the same rounding is Math.round on an exact cents value.
 */

/** iOS default when no tax rate is stored: 8.875% (CartViewModel.taxRate). */
export const DEFAULT_TAX_RATE = 0.08875;

/** Tip presets from TipSelectionView. */
export const TIP_PERCENTS = [15, 18, 20, 25] as const;

/** Quick cash amounts from CashTenderView, in cents. */
export const QUICK_CASH_CENTS = [500, 1000, 2000, 5000, 10000] as const;

export type PaymentType = 'cash' | 'card' | 'split';

export interface CartLine {
  /** Stable key: item id + size. */
  key: string;
  itemId: string;
  name: string;
  size: string;
  sku: string;
  unitCents: number;
  quantity: number;
}

/** Round half up to a whole cent (positive amounts), like Decimal.rounded2. */
export function roundCents(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function lineTotalCents(line: Pick<CartLine, 'unitCents' | 'quantity'>): number {
  return roundCents(line.unitCents * line.quantity);
}

export function subtotalCents(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + lineTotalCents(l), 0);
}

/**
 * Tax on a subtotal. The rate is applied as an integer fraction of 100000 so
 * that 8.875% stays exact and half-cent results round up as in iOS.
 */
export function taxCents(subtotal: number, rate = DEFAULT_TAX_RATE): number {
  const perHundredThousand = Math.round(rate * 100000);
  return roundCents((subtotal * perHundredThousand) / 100000);
}

export interface CartTotals {
  subtotal: number;
  tax: number;
  total: number;
  units: number;
}

export function cartTotals(lines: readonly CartLine[], rate = DEFAULT_TAX_RATE): CartTotals {
  const subtotal = subtotalCents(lines);
  const tax = taxCents(subtotal, rate);
  return {
    subtotal,
    tax,
    total: subtotal + tax,
    units: lines.reduce((n, l) => n + l.quantity, 0),
  };
}

/** CartViewModel.addItem: same item and size increments, otherwise appends. */
export function addToCart(lines: readonly CartLine[], line: Omit<CartLine, 'quantity'>): CartLine[] {
  const i = lines.findIndex((l) => l.key === line.key);
  if (i >= 0) {
    return lines.map((l, j) => (j === i ? { ...l, quantity: l.quantity + 1 } : l));
  }
  return [...lines, { ...line, quantity: 1 }];
}

/** CartViewModel.updateQuantity: zero or less removes the line. */
export function setQuantity(lines: readonly CartLine[], key: string, quantity: number): CartLine[] {
  if (quantity <= 0) return lines.filter((l) => l.key !== key);
  return lines.map((l) => (l.key === key ? { ...l, quantity } : l));
}

export function removeLine(lines: readonly CartLine[], key: string): CartLine[] {
  return lines.filter((l) => l.key !== key);
}

/** PaymentViewModel.calculateTip: percent of the sale total (after tax). */
export function tipCents(percent: number, totalCents: number): number {
  return roundCents((totalCents * percent) / 100);
}

/** PaymentViewModel.cashChange: never negative. */
export function cashChangeCents(tenderedCents: number, totalDueCents: number): number {
  const change = tenderedCents - totalDueCents;
  return change > 0 ? change : 0;
}

/** PaymentViewModel.splitCardAmount: the rest of the total after cash, or 0 if cash exceeds it. */
export function splitCardCents(totalDueCents: number, splitCashCents: number): number {
  if (splitCashCents > totalDueCents) return 0;
  return totalDueCents - splitCashCents;
}

/** PaymentViewModel.isPaymentValid. */
export function isPaymentValid(
  type: PaymentType,
  totalDueCents: number,
  opts: { tenderedCents?: number; splitCashCents?: number } = {}
): boolean {
  switch (type) {
    case 'cash':
      return (opts.tenderedCents ?? 0) >= totalDueCents;
    case 'card':
      return true;
    case 'split': {
      const cash = opts.splitCashCents ?? 0;
      return cash > 0 && cash < totalDueCents;
    }
  }
}

/** Parse a typed dollar amount ("20", "$20.5", "12.345") to cents; invalid or negative is null. */
export function parseDollars(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, '');
  if (cleaned === '' || !/^\d*\.?\d*$/.test(cleaned) || cleaned === '.') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString('en-US');
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Transactions and settlement
// ---------------------------------------------------------------------------

export interface Sale {
  id: string;
  number: string;
  createdAt: number;
  lines: CartLine[];
  subtotal: number;
  tax: number;
  tip: number;
  /** Cart total + tip, as Transaction.totalAmount in iOS. */
  total: number;
  paymentType: PaymentType;
  cashTendered?: number;
  cashChange?: number;
  splitCash?: number;
  splitCard?: number;
  cardLastFour?: string;
}

/** A comp hand-off: units leave stock with no payment. */
export interface Comp {
  id: string;
  createdAt: number;
  lines: CartLine[];
  /** GMS or band comp. */
  kind: 'gms' | 'band';
}

/** Build a completed sale from the cart, like CartViewModel.saveTransaction. */
export function buildSale(args: {
  id: string;
  createdAt: number;
  lines: readonly CartLine[];
  taxRate?: number;
  tip: number;
  paymentType: PaymentType;
  cashTendered?: number;
  splitCash?: number;
}): Sale {
  const totals = cartTotals(args.lines, args.taxRate);
  const total = totals.total + args.tip;
  const sale: Sale = {
    id: args.id,
    number: `TXN-${Math.floor(args.createdAt / 1000)}`,
    createdAt: args.createdAt,
    lines: args.lines.map((l) => ({ ...l })),
    subtotal: totals.subtotal,
    tax: totals.tax,
    tip: args.tip,
    total,
    paymentType: args.paymentType,
  };
  if (args.paymentType === 'cash') {
    sale.cashTendered = args.cashTendered ?? total;
    sale.cashChange = cashChangeCents(sale.cashTendered, total);
  }
  if (args.paymentType === 'card' || args.paymentType === 'split') sale.cardLastFour = '4242';
  if (args.paymentType === 'split') {
    sale.splitCash = args.splitCash ?? 0;
    sale.splitCard = splitCardCents(total, sale.splitCash);
  }
  return sale;
}

/** DemoSettlementView.cashTotal: cash sales in full plus the cash part of splits. */
export function cashCollectedCents(sales: readonly Sale[]): number {
  return sales.reduce((sum, s) => {
    if (s.paymentType === 'cash') return sum + s.total;
    if (s.paymentType === 'split') return sum + (s.splitCash ?? 0);
    return sum;
  }, 0);
}

/** DemoSettlementView.cardTotal: card sales in full plus the card part of splits. */
export function cardCollectedCents(sales: readonly Sale[]): number {
  return sales.reduce((sum, s) => {
    if (s.paymentType === 'card') return sum + s.total;
    if (s.paymentType === 'split') return sum + (s.splitCard ?? s.total - (s.splitCash ?? 0));
    return sum;
  }, 0);
}

export type Counts = Record<string, number>;

function unitsByKey(groups: readonly { lines: readonly CartLine[] }[]): Counts {
  const out: Counts = {};
  for (const g of groups) for (const l of g.lines) out[l.key] = (out[l.key] ?? 0) + l.quantity;
  return out;
}

export function soldUnitsByKey(sales: readonly Sale[]): Counts {
  return unitsByKey(sales);
}

export function compUnitsByKey(comps: readonly Comp[]): Counts {
  return unitsByKey(comps);
}

/** Expected closing count per item and size: opening − sold − comps. */
export function expectedClosing(opening: Counts, sales: readonly Sale[], comps: readonly Comp[]): Counts {
  const sold = soldUnitsByKey(sales);
  const comped = compUnitsByKey(comps);
  const out: Counts = {};
  for (const key of Object.keys(opening)) {
    out[key] = opening[key] - (sold[key] ?? 0) - (comped[key] ?? 0);
  }
  return out;
}

export interface Settlement {
  openingUnits: number;
  unitsSold: number;
  unitsComped: number;
  expectedClosingUnits: number;
  closingUnits: number;
  /** closing − expected; negative means units missing. */
  unitVariance: number;
  transactions: number;
  grossSales: number;
  tax: number;
  tips: number;
  totalCollected: number;
  cash: number;
  card: number;
  openingBank: number;
  expectedDrawer: number;
  countedDrawer: number;
  /** counted − expected drawer, as ReconciliationView.discrepancy (with the opening bank added). */
  cashVariance: number;
}

const sumCounts = (c: Counts) => Object.values(c).reduce((a, b) => a + b, 0);

/**
 * Settlement for a session. `closing` holds counted units per key; keys missing
 * from it are taken as their expected value (not recounted).
 */
export function settle(args: {
  opening: Counts;
  closing: Counts;
  sales: readonly Sale[];
  comps: readonly Comp[];
  openingBank: number;
  countedDrawer: number;
}): Settlement {
  const { opening, closing, sales, comps, openingBank, countedDrawer } = args;
  const expected = expectedClosing(opening, sales, comps);
  const closingCounts: Counts = {};
  for (const key of Object.keys(expected)) closingCounts[key] = closing[key] ?? expected[key];
  const expectedClosingUnits = sumCounts(expected);
  const closingUnits = sumCounts(closingCounts);
  const cash = cashCollectedCents(sales);
  const expectedDrawer = openingBank + cash;
  return {
    openingUnits: sumCounts(opening),
    unitsSold: sumCounts(soldUnitsByKey(sales)),
    unitsComped: sumCounts(compUnitsByKey(comps)),
    expectedClosingUnits,
    closingUnits,
    unitVariance: closingUnits - expectedClosingUnits,
    transactions: sales.length,
    grossSales: sales.reduce((s, t) => s + t.subtotal, 0),
    tax: sales.reduce((s, t) => s + t.tax, 0),
    tips: sales.reduce((s, t) => s + t.tip, 0),
    totalCollected: sales.reduce((s, t) => s + t.total, 0),
    cash,
    card: cardCollectedCents(sales),
    openingBank,
    expectedDrawer,
    countedDrawer,
    cashVariance: countedDrawer - expectedDrawer,
  };
}
