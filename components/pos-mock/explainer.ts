import type { Screen } from './state';

export interface Explainer {
  title: string;
  /** What this screen replaces in the AtVenu or manual process. */
  replaces: string;
}

/** Shown on every screen, below the screen note. */
export const HONESTY_NOTE =
  'In this mock, nothing is saved. In the app, sales are stored on the iPad with the show; sync to the tracker is planned and not built yet.';

export const EXPLAINERS: Record<Screen, Explainer> = {
  welcome: {
    title: 'Setup',
    replaces: 'Replaces setting up a stand in the AtVenu portal. The iPad is set up once per tour, here, with the same steps as the iOS app.',
  },
  mode: {
    title: 'Choose a mode',
    replaces: 'Demo mode uses simulated card payments and keeps practice sales apart from real ones, so a vendor can learn the register before a show.',
  },
  'atvenu-compare': {
    title: 'Switching from AtVenu',
    replaces: 'A side-by-side of the current AtVenu steps and what changes. This table is the same copy as the iOS app.',
  },
  'atvenu-mapping': {
    title: 'Match columns',
    replaces: 'Replaces building the product list by hand. The AtVenu CSV export is imported once; columns are matched by header name.',
  },
  register: {
    title: 'Register',
    replaces: 'Replaces the AtVenu register. The grid shows the tour catalog from the tracker (products and sizes), so no separate product setup.',
  },
  method: {
    title: 'Payment method',
    replaces: 'Cash, card or split, as in AtVenu. In the app, card payments are planned through Stripe Terminal.',
  },
  tip: {
    title: 'Tip',
    replaces: 'Tips are recorded with the sale, so they show up in settlement instead of being added up by hand.',
  },
  cash: {
    title: 'Cash',
    replaces: 'Change is calculated for the vendor. Cash sales feed the drawer total used at count-out.',
  },
  card: {
    title: 'Card',
    replaces: 'In this mock the reader is simulated and no card data is entered. In the app, Stripe Terminal reader pairing is not built yet.',
  },
  'split-cash': {
    title: 'Split payment',
    replaces: 'Part cash, part card on one sale. The cash part goes to the drawer total, the card part to card totals.',
  },
  'split-card': {
    title: 'Split payment',
    replaces: 'The card charge for the rest of a split sale. Simulated here.',
  },
  receipt: {
    title: 'Receipt',
    replaces: 'Sales recorded here go straight to the show record; no AtVenu export or re-typing.',
  },
  countout: {
    title: 'Count-out',
    replaces: 'Replaces the paper count-out sheet. Expected stock is opening count minus sales and comps, so only differences need attention.',
  },
  settlement: {
    title: 'Settlement',
    replaces: 'Replaces building the settlement from a downloaded AtVenu report. Totals, cash vs card and variances come from this session’s sales and counts.',
  },
};
