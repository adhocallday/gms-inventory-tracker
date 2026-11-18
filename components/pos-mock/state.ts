/**
 * Client-only state for the POS mock. Nothing here is sent anywhere; the
 * whole state can be kept in sessionStorage so a reload keeps the session.
 */
import {
  addToCart,
  buildSale,
  removeLine,
  setQuantity,
  type CartLine,
  type Comp,
  type Counts,
  type PaymentType,
  type Sale,
} from './math';

export type Screen =
  | 'welcome'
  | 'mode'
  | 'atvenu-compare'
  | 'atvenu-mapping'
  | 'register'
  | 'method'
  | 'tip'
  | 'cash'
  | 'card'
  | 'split-cash'
  | 'split-card'
  | 'receipt'
  | 'countout'
  | 'settlement';

export const ONBOARDING_STEPS: { screen: Screen; title: string }[] = [
  { screen: 'welcome', title: 'Welcome' },
  { screen: 'mode', title: 'Choose a mode' },
  { screen: 'atvenu-compare', title: 'Switching from AtVenu' },
  { screen: 'atvenu-mapping', title: 'Match columns' },
];

export const CHECKOUT_SCREENS: Screen[] = ['method', 'tip', 'cash', 'card', 'split-cash', 'split-card', 'receipt'];

/** Seeded cash bank in the drawer at doors, in cents. */
export const OPENING_BANK_CENTS = 20000;

export interface PosState {
  screen: Screen;
  cart: CartLine[];
  sales: Sale[];
  comps: Comp[];
  /** Checkout in progress. */
  payType: PaymentType;
  tip: number;
  tipPercent: number | null;
  tendered: number;
  splitCash: number;
  lastSaleId: string | null;
  /** Count-out entries: counted units per line key; missing = not recounted. */
  closing: Counts;
  /** Counted cash drawer in cents; null until the count-out screen sets it. */
  countedDrawer: number | null;
  /** Last comp, for a short confirmation. */
  lastCompId: string | null;
}

export const initialState: PosState = {
  screen: 'welcome',
  cart: [],
  sales: [],
  comps: [],
  payType: 'card',
  tip: 0,
  tipPercent: null,
  tendered: 0,
  splitCash: 0,
  lastSaleId: null,
  closing: {},
  countedDrawer: null,
  lastCompId: null,
};

export type Action =
  | { type: 'go'; screen: Screen }
  | { type: 'add'; line: Omit<CartLine, 'quantity'> }
  | { type: 'qty'; key: string; quantity: number }
  | { type: 'remove'; key: string }
  | { type: 'clearCart' }
  | { type: 'choosePayment'; payType: PaymentType }
  | { type: 'tipPercent'; percent: number; tip: number }
  | { type: 'tipCustom'; tip: number }
  | { type: 'tipNone' }
  | { type: 'tender'; cents: number }
  | { type: 'splitCash'; cents: number }
  | { type: 'completeSale'; id: string; at: number }
  | { type: 'newSale' }
  | { type: 'comp'; id: string; at: number; kind: Comp['kind'] }
  | { type: 'count'; key: string; units: number }
  | { type: 'drawer'; cents: number }
  | { type: 'reset' }
  | { type: 'restore'; state: PosState };

const resetCheckout = { tip: 0, tipPercent: null, tendered: 0, splitCash: 0 } as const;

export function reducer(state: PosState, action: Action): PosState {
  switch (action.type) {
    case 'go':
      return { ...state, screen: action.screen, lastCompId: null };
    case 'add':
      return { ...state, cart: addToCart(state.cart, action.line), lastCompId: null };
    case 'qty':
      return { ...state, cart: setQuantity(state.cart, action.key, action.quantity) };
    case 'remove':
      return { ...state, cart: removeLine(state.cart, action.key) };
    case 'clearCart':
      return { ...state, cart: [] };
    case 'choosePayment':
      return { ...state, ...resetCheckout, payType: action.payType, screen: 'tip' };
    case 'tipPercent':
      return { ...state, tipPercent: action.percent, tip: action.tip };
    case 'tipCustom':
      return { ...state, tipPercent: null, tip: action.tip };
    case 'tipNone':
      return { ...state, tipPercent: null, tip: 0 };
    case 'tender':
      return { ...state, tendered: action.cents };
    case 'splitCash':
      return { ...state, splitCash: action.cents };
    case 'completeSale': {
      if (state.cart.length === 0) return state;
      const sale = buildSale({
        id: action.id,
        createdAt: action.at,
        lines: state.cart,
        tip: state.tip,
        paymentType: state.payType,
        cashTendered: state.payType === 'cash' ? state.tendered : undefined,
        splitCash: state.payType === 'split' ? state.splitCash : undefined,
      });
      return { ...state, sales: [...state.sales, sale], cart: [], lastSaleId: sale.id, screen: 'receipt' };
    }
    case 'newSale':
      return { ...state, ...resetCheckout, screen: 'register' };
    case 'comp': {
      if (state.cart.length === 0) return state;
      const comp: Comp = { id: action.id, createdAt: action.at, kind: action.kind, lines: state.cart.map((l) => ({ ...l })) };
      return { ...state, comps: [...state.comps, comp], cart: [], lastCompId: comp.id };
    }
    case 'count':
      return { ...state, closing: { ...state.closing, [action.key]: Math.max(0, Math.floor(action.units)) } };
    case 'drawer':
      return { ...state, countedDrawer: Math.max(0, action.cents) };
    case 'reset':
      return initialState;
    case 'restore':
      return action.state;
  }
}

export const STORAGE_KEY = 'mf.posMock.v1';

/** Accept a stored state only if it has the expected shape. */
export function parseStored(raw: string | null): PosState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PosState>;
    if (!value || typeof value !== 'object' || typeof value.screen !== 'string') return null;
    if (!Array.isArray(value.cart) || !Array.isArray(value.sales) || !Array.isArray(value.comps)) return null;
    return { ...initialState, ...value } as PosState;
  } catch {
    return null;
  }
}

/** Local id for a sale or comp; not a database id. */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
