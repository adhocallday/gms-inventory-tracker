import { describe, expect, it } from 'vitest';
import {
  addToCart,
  buildSale,
  cardCollectedCents,
  cartTotals,
  cashChangeCents,
  cashCollectedCents,
  DEFAULT_TAX_RATE,
  expectedClosing,
  formatCents,
  isPaymentValid,
  parseDollars,
  removeLine,
  setQuantity,
  settle,
  splitCardCents,
  taxCents,
  tipCents,
  type CartLine,
  type Comp,
} from './math';
import { buildCatalogItems, displayName, placeholderPriceCents } from './catalog';

const tee = { key: 'tee::M', itemId: 'tee', name: 'Itin Tee', size: 'M', sku: 'T', unitCents: 4500 };
const hoodie = { key: 'hood::L', itemId: 'hood', name: 'Hoodie', size: 'L', sku: 'H', unitCents: 8000 };

describe('cart', () => {
  it('adds the same item and size as one line with a higher quantity', () => {
    let cart: CartLine[] = [];
    cart = addToCart(cart, tee);
    cart = addToCart(cart, tee);
    cart = addToCart(cart, hoodie);
    expect(cart.map((l) => [l.key, l.quantity])).toEqual([
      ['tee::M', 2],
      ['hood::L', 1],
    ]);
  });

  it('removes a line when its quantity goes to zero, and on remove', () => {
    const cart = addToCart(addToCart([], tee), hoodie);
    expect(setQuantity(cart, 'tee::M', 3)[0].quantity).toBe(3);
    expect(setQuantity(cart, 'tee::M', 0).map((l) => l.key)).toEqual(['hood::L']);
    expect(removeLine(cart, 'hood::L').map((l) => l.key)).toEqual(['tee::M']);
  });

  it('uses the iOS default tax rate of 8.875%', () => {
    expect(DEFAULT_TAX_RATE).toBe(0.08875);
    // One $45 tee: 45 × 0.08875 = 3.99375 → $3.99 (the iOS settlement shows $48.99).
    const totals = cartTotals(addToCart([], tee));
    expect(totals).toEqual({ subtotal: 4500, tax: 399, total: 4899, units: 1 });
  });

  it('rounds half a cent up, like Decimal.rounded2 (.plain)', () => {
    // $40 × 0.08875 = 3.55 exactly; $2 × 0.08875 = 0.1775 → 0.18
    expect(taxCents(4000)).toBe(355);
    expect(taxCents(200)).toBe(18);
    expect(taxCents(12500, 0)).toBe(0);
  });

  it('totals several lines', () => {
    const cart = setQuantity(addToCart(addToCart([], tee), hoodie), 'tee::M', 2);
    // 90 + 80 = 170; tax 15.0875 → 15.09
    expect(cartTotals(cart)).toEqual({ subtotal: 17000, tax: 1509, total: 18509, units: 3 });
  });
});

describe('tip, change and split', () => {
  it('calculates tip as a percent of the total after tax', () => {
    expect(tipCents(15, 4899)).toBe(735); // 7.3485
    expect(tipCents(18, 4899)).toBe(882); // 8.8182
    expect(tipCents(20, 4899)).toBe(980); // 9.798
    expect(tipCents(25, 4899)).toBe(1225); // 12.2475
    expect(tipCents(20, 3780)).toBe(756);
  });

  it('gives change only when cash exceeds the total', () => {
    expect(cashChangeCents(5000, 4899)).toBe(101);
    expect(cashChangeCents(4899, 4899)).toBe(0);
    expect(cashChangeCents(2000, 4899)).toBe(0);
  });

  it('puts the rest of a split on the card', () => {
    expect(splitCardCents(4899, 2000)).toBe(2899);
    expect(splitCardCents(4899, 6000)).toBe(0);
  });

  it('validates payments as PaymentViewModel.isPaymentValid', () => {
    expect(isPaymentValid('cash', 4899, { tenderedCents: 4899 })).toBe(true);
    expect(isPaymentValid('cash', 4899, { tenderedCents: 4898 })).toBe(false);
    expect(isPaymentValid('card', 4899)).toBe(true);
    expect(isPaymentValid('split', 4899, { splitCashCents: 0 })).toBe(false);
    expect(isPaymentValid('split', 4899, { splitCashCents: 4899 })).toBe(false);
    expect(isPaymentValid('split', 4899, { splitCashCents: 2000 })).toBe(true);
  });

  it('parses and formats dollar amounts', () => {
    expect(parseDollars('20')).toBe(2000);
    expect(parseDollars('$1,020.50')).toBe(102050);
    expect(parseDollars('abc')).toBeNull();
    expect(parseDollars('')).toBeNull();
    expect(formatCents(105609)).toBe('$1,056.09');
    expect(formatCents(-500)).toBe('-$5.00');
  });
});

describe('settlement', () => {
  const opening = { 'tee::M': 48, 'hood::L': 20, 'hat::OS': 30 };
  const cardSale = buildSale({ id: 'a', createdAt: 1_000_000, lines: addToCart([], tee), tip: 980, paymentType: 'card' });
  const cashSale = buildSale({
    id: 'b',
    createdAt: 2_000_000,
    lines: setQuantity(addToCart([], hoodie), 'hood::L', 2),
    tip: 0,
    paymentType: 'cash',
    cashTendered: 20000,
  });
  const splitSale = buildSale({ id: 'c', createdAt: 3_000_000, lines: addToCart([], tee), tip: 0, paymentType: 'split', splitCash: 2000 });
  const comp: Comp = { id: 'd', createdAt: 4_000_000, kind: 'band', lines: [{ ...tee, key: 'hat::OS', itemId: 'hat', size: 'OS', quantity: 2 }] };
  const sales = [cardSale, cashSale, splitSale];

  it('builds sales like saveTransaction', () => {
    expect(cardSale.total).toBe(4899 + 980);
    expect(cardSale.cardLastFour).toBe('4242');
    // 160 + 14.20 tax = 174.20; tendered 200 → 25.80 change
    expect(cashSale.total).toBe(17420);
    expect(cashSale.cashChange).toBe(2580);
    expect(splitSale.splitCash).toBe(2000);
    expect(splitSale.splitCard).toBe(2899);
    expect(cardSale.number).toBe('TXN-1000');
  });

  it('splits collected money into cash and card', () => {
    expect(cashCollectedCents(sales)).toBe(17420 + 2000);
    expect(cardCollectedCents(sales)).toBe(5879 + 2899);
  });

  it('expects closing = opening − sold − comps', () => {
    expect(expectedClosing(opening, sales, [comp])).toEqual({ 'tee::M': 46, 'hood::L': 18, 'hat::OS': 28 });
  });

  it('reports unit and cash variance against the counts', () => {
    const s = settle({
      opening,
      closing: { 'tee::M': 45 },
      sales,
      comps: [comp],
      openingBank: 20000,
      countedDrawer: 20000 + 19420 - 500,
    });
    expect(s.openingUnits).toBe(98);
    expect(s.unitsSold).toBe(4);
    expect(s.unitsComped).toBe(2);
    expect(s.expectedClosingUnits).toBe(92);
    expect(s.closingUnits).toBe(91);
    expect(s.unitVariance).toBe(-1);
    expect(s.transactions).toBe(3);
    expect(s.grossSales).toBe(4500 + 16000 + 4500);
    expect(s.tips).toBe(980);
    expect(s.totalCollected).toBe(s.cash + s.card);
    expect(s.expectedDrawer).toBe(39420);
    expect(s.cashVariance).toBe(-500);
  });
});

describe('catalog builder', () => {
  it('groups sizes per product, falls back to placeholder prices and marks them', () => {
    const items = buildCatalogItems(
      [
        { product_id: 'p1', size: 'L', suggested_retail: null, is_active: true, products: { sku: 'X1', description: 'SKELETOUR ITIN TEE', product_type: 'T-Shirt' } },
        { product_id: 'p1', size: 'S', suggested_retail: null, is_active: true, products: { sku: 'X1', description: 'SKELETOUR ITIN TEE', product_type: 'T-Shirt' } },
        { product_id: 'p1', size: 'XL', suggested_retail: null, is_active: false, products: { sku: 'X1', description: 'SKELETOUR ITIN TEE', product_type: 'T-Shirt' } },
        { product_id: 'p2', size: 'OS', suggested_retail: '35.00', is_active: true, products: { sku: 'X2', description: 'HAT', product_type: 'Hat' } },
        { product_id: 'p3', size: 'OS', suggested_retail: null, is_active: true, products: { sku: 'X3', description: 'SLING BAG', product_type: 'Bag' } },
      ],
      (id) => (id === 'p2' ? `/img/${id}` : null)
    );
    expect(items).toEqual([
      { id: 'p1', name: 'Skeletour Itin Tee', sku: 'X1', category: 'T-Shirt', sizes: [{ size: 'S', priceCents: 4000 }, { size: 'L', priceCents: 4000 }], samplePrice: true, imageUrl: null },
      { id: 'p2', name: 'Hat', sku: 'X2', category: 'Hat', sizes: [{ size: 'OS', priceCents: 3500 }], samplePrice: false, imageUrl: '/img/p2' },
      { id: 'p3', name: 'Sling Bag', sku: 'X3', category: 'Bag', sizes: [{ size: 'OS', priceCents: 4500 }], samplePrice: true, imageUrl: null },
    ]);
  });

  it('tidies all-caps names', () => {
    expect(displayName('POLTERGEIST SKELETA LP')).toBe('Poltergeist Skeleta LP');
    expect(displayName('Batwing Zip Hoodie')).toBe('Batwing Zip Hoodie');
    expect(placeholderPriceCents('OPUS TANK TOP', 'Tank Top')).toBe(4000);
  });
});
