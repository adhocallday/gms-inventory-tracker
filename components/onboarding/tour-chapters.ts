/**
 * The guided tours' story: two tours of chapters of steps, each step anchored
 * to a data-tour="…" element on one page. Kept free of React and the DOM so
 * the navigation rules can be unit tested.
 *
 * - `overview`: MerchFlow overview, for GMS leadership and finance (default).
 * - `full`: the full walkthrough of every screen, for operations staff.
 *
 * Both follow the app's own navigation and visit each section once: the
 * sidebar (bottom bar on phones) Upload → Documents → Tours → Admin → POS,
 * and inside a tour the shows list and the tabs Inventory → COGS →
 * Projections → Reports. Each chapter after the first opens with a "where to
 * click" step (`via`) on the real sidebar item or tab; Next opens it, or the
 * visitor clicks it and the tour follows.
 */

import { CHARTS_URL, FLOW_URL } from '@/lib/apps';
import {
  DEFAULT_TOUR,
  isTourId,
  type TourId,
  type TourIds,
  type TourPosition,
} from './tour-types';

export { DEFAULT_TOUR, isTourId };
export type { TourId, TourIds, TourPosition };

/** The pages the tour visits. Dynamic ones need ids resolved at tour start. */
export type TourPage =
  | 'welcome'
  | 'home'
  | 'tour'
  | 'show'
  | 'upload'
  | 'documents'
  | 'review'
  | 'inventory'
  | 'cogs'
  | 'projections'
  | 'reports'
  | 'merchFlow'
  | 'admin'
  | 'adminTours'
  | 'adminNewTour'
  | 'adminProducts'
  | 'adminInventory'
  | 'adminDocuments'
  | 'adminAnalytics'
  | 'pos'
  | 'posDemo';

/** Names for the "Loading Inventory…" line shown while the tour opens a page. */
export const PAGE_LABELS: Record<TourPage, string> = {
  welcome: 'How MerchFlow works',
  home: 'Tours',
  tour: 'the tour',
  show: 'the show',
  upload: 'Upload',
  documents: 'Documents',
  review: 'the document',
  inventory: 'Inventory',
  cogs: 'COGS',
  projections: 'Projections',
  reports: 'Reports',
  merchFlow: 'the Merch Flow report',
  admin: 'Admin',
  adminTours: 'Admin tours',
  adminNewTour: 'New tour',
  adminProducts: 'Products',
  adminInventory: 'Inventory, all tours',
  adminDocuments: 'Documents, all tours',
  adminAnalytics: 'Analytics',
  pos: 'MerchFlow POS',
  posDemo: 'the POS demo',
};

/** The sidebar and bottom-bar anchors a `via: 'nav'` step may highlight. */
export const NAV_ANCHORS = ['upload', 'documents', 'nav-tours', 'nav-admin', 'pos-link', 'nav-welcome', 'nav-menu'] as const;
/** The tour-page anchors a `via: 'tab'` step may highlight: the shows list and the tabs. */
export const TAB_ANCHORS = ['tour-shows', 'inventory', 'tab-cogs', 'tab-projections', 'tab-reports'] as const;

export interface TourStep {
  /**
   * The page the step is shown on. For a `via: 'nav'` step, the page its
   * sidebar item opens: the step itself is shown on whatever page is open.
   */
  page: TourPage;
  /** data-tour value to highlight. Omitted: a centred popover with no highlight. */
  anchor?: string;
  /** Highlighted instead when the anchor is absent (for example, no rows to show, or Menu on a phone). */
  fallbackAnchor?: string;
  /**
   * A "where to click" step. 'nav': a sidebar (or bottom bar) item, shown on
   * the current page. 'tab': the shows list or a tab on the tour page. Next
   * opens the next step's page; clicking the item does the same.
   */
  via?: 'nav' | 'tab';
  /** Run before looking for the anchor: open the tab (by its element id) that holds it. */
  before?: { openTab: string };
  title: string;
  /** May use {tokens} from ./tour-facts, filled with live figures. */
  body: string;
  /** Shown instead of `body` when its {tokens} cannot be filled (no live figures). */
  bodyWithoutFigures?: string;
  /**
   * Shown instead of `body` when the step's data is missing: the page needs an
   * id that could not be resolved, or the anchor never appeared.
   */
  gap?: string;
  links?: { label: string; href: string }[];
}

export interface Chapter {
  id: string;
  title: string;
  summary: string;
  steps: TourStep[];
}

export interface TourDefinition {
  id: TourId;
  /** Short name used in the chapter label, e.g. "Overview · 3 of 8 · …". */
  label: string;
  title: string;
  audience: string;
  /** The first chapter's number: the overview counts from 1, the full walkthrough from 0. */
  firstNumber: 0 | 1;
  chapters: Chapter[];
}

const NO_TOUR =
  'There are no tours in the tracker yet, so this page cannot be opened. Tours are created under Admin, then filled from uploaded documents.';

const NO_DOC =
  'There is no document to open yet. On a document, the extracted fields, the GMS rule checks and the approve and post buttons are shown together.';

const NO_SHOW =
  'No show is available. A show page lists its sales lines, comps, stock before and after, and the settlement: gross, tax, fees and net, with a link to the source document.';

/** The current-process notes on /welcome sit in the "Current" tab of the flow views. */
const CURRENT_TAB = { openTab: 'mfd-tab-current' };

/* ── Where-to-click steps shared by both tours ─────────────────────────── */

const openUpload: TourStep = {
  page: 'upload',
  via: 'nav',
  anchor: 'upload',
  title: 'Open Upload document',
  body: 'Every document comes in through Upload document, at the bottom of the sidebar (Upload in the bottom bar on a phone). Next opens it.',
};

const openDocuments: TourStep = {
  page: 'documents',
  via: 'nav',
  anchor: 'documents',
  title: 'Open Documents',
  body: 'Each upload becomes a draft under Documents in the sidebar (the bottom bar on a phone). Next opens the list.',
};

const openTours: TourStep = {
  page: 'home',
  via: 'nav',
  anchor: 'nav-tours',
  title: 'Open Tours',
  body: 'Tours, at the top of the sidebar (the bottom bar on a phone), lists every tour. Next opens it.',
};

const openInventoryTab: TourStep = {
  page: 'tour',
  via: 'tab',
  anchor: 'inventory',
  title: 'Open the Inventory tab',
  body: 'The tabs on the tour page open each part of the tour. Inventory is next.',
  gap: NO_TOUR,
};

const openCogsTab: TourStep = {
  page: 'tour',
  via: 'tab',
  anchor: 'tab-cogs',
  title: 'Open the COGS tab',
  body: 'Back on the tour page, COGS is the next tab.',
  gap: NO_TOUR,
};

const openProjectionsTab: TourStep = {
  page: 'tour',
  via: 'tab',
  anchor: 'tab-projections',
  title: 'Open the Projections tab',
  body: 'Projections is the tab for the rest of the tour: what will sell and what to reorder.',
  gap: NO_TOUR,
};

const openReportsTab: TourStep = {
  page: 'tour',
  via: 'tab',
  anchor: 'tab-reports',
  title: 'Open the Reports tab',
  body: 'Reports holds the Merch Flow report for this tour and the Business Central connection.',
  gap: NO_TOUR,
};

const openAdmin = (page: TourPage, body: string): TourStep => ({
  page,
  via: 'nav',
  anchor: 'nav-admin',
  fallbackAnchor: 'nav-menu',
  title: 'Open Admin',
  body,
});

const openPos: TourStep = {
  page: 'pos',
  via: 'nav',
  anchor: 'pos-link',
  title: 'Open MerchFlow POS',
  body: 'POS is under MerchFlow apps in the sidebar (POS in the bottom bar on a phone). Next opens it.',
};

const openWelcome: TourStep = {
  page: 'welcome',
  via: 'nav',
  anchor: 'nav-welcome',
  fallbackAnchor: 'nav-menu',
  title: 'Back to How MerchFlow works',
  body: 'How MerchFlow works, under Help in the sidebar (Menu on a phone), has the summary. Next opens it.',
};

/**
 * The MerchFlow overview: one document enters once, GMS business rules check
 * it, it is written to one central database, and every report and system
 * reads from that one record.
 */
export const OVERVIEW_CHAPTERS: Chapter[] = [
  {
    id: 'today',
    title: 'Where the time and risk are today',
    summary: '10 manual steps per show, figures typed twice, and the delay and risk that adds.',
    steps: [
      {
        page: 'welcome',
        anchor: 'flow-diagram',
        before: CURRENT_TAB,
        title: '10 manual steps per show',
        body: 'This is the current process for one show. Each red number is a manual step: a download, a portal login, or typing the same figures again. There are 10.',
      },
      {
        page: 'welcome',
        anchor: 'flow-current-note-1',
        fallbackAnchor: 'flow-diagram',
        before: CURRENT_TAB,
        title: 'Typed twice, and more',
        body: 'Sales, settlements and comps are keyed into the Tracker and again into Business Central, after two separate logins to the AtVenu portal. Packing lists are typed three times. The copies can disagree.',
      },
      {
        page: 'welcome',
        anchor: 'welcome-counts',
        title: 'Each step adds delay and risk',
        body: 'Every manual step adds a delay and a chance of a keying error, and sales are visible only once the typing is done. The rest of this overview shows how MerchFlow takes 10 steps to 1, and to 0 with MerchFlow POS.',
      },
    ],
  },
  {
    id: 'documents',
    title: 'Getting documents in',
    summary: 'One intake, a review queue, and fixed GMS rules that check every draft before it is posted.',
    steps: [
      openUpload,
      {
        page: 'upload',
        anchor: 'upload-dropzone',
        title: 'One intake for every document',
        body: 'Purchase orders, packing lists, sales reports and settlements all come in here, with no form per document type. AI recognises the type and matches the tour and show. Upload in the browser works today; an email-in address and iPad scanning at receiving are planned to feed this same intake.',
      },
      openDocuments,
      {
        page: 'documents',
        anchor: 'docs-list',
        fallbackAnchor: 'docs-filters',
        title: 'The review queue',
        body: 'Drafts and flagged documents wait here until someone approves or rejects them; filter by type and status to see what is outstanding. Nothing reaches the tour, inventory or reports before that. Next opens a draft.',
        gap: 'No documents have been uploaded yet. Each upload appears here as a draft and waits until someone approves or rejects it.',
      },
      {
        page: 'review',
        anchor: 'review-form',
        title: 'AI only extracts fields',
        body: 'AI read the document and filled in these fields. It does not decide, calculate or post anything.',
        gap: NO_DOC,
      },
      {
        page: 'review',
        anchor: 'review-validation',
        title: 'Fixed GMS rules check the draft',
        body: "Rules, not AI, check the extracted data: SKU and size against the catalogue, required fields, line totals against the reported gross, and a packing list must match a known PO. A file already posted is recognised by its fingerprint and not drafted again, and posting a show's sales again replaces them, never adds them twice. Per-head and show-date checks are being added.",
        gap: NO_DOC,
      },
      {
        page: 'review',
        anchor: 'review-actions',
        title: 'Exceptions go to a person',
        body: 'Flagged fields are marked for a person to correct. Approve and post writes the record; Reject discards it; a draft with missing required fields cannot be posted. Every posted record keeps the id of this document (source_doc_id), so any figure traces back to the original file.',
        gap: NO_DOC,
      },
    ],
  },
  {
    id: 'database',
    title: 'One database, one set of numbers',
    summary: 'Every screen after this reads the same posted records.',
    steps: [
      openTours,
      {
        page: 'home',
        anchor: 'tours-dashboard',
        title: 'One central database',
        body: 'Every tour is built from posted documents in one database. The Tracker, MerchFlow Charts and POS all read it. Next opens a tour.',
      },
      {
        page: 'tour',
        anchor: 'tour-kpis',
        title: 'Live figures: {tour}',
        body: '{gross} gross from {shows} shows with sales. {units} units sold. {perHead} per head on {attendance} attendance. Summed from posted records; none is typed in.',
        bodyWithoutFigures: 'Gross, per head, shows with sales and units on hand, summed from posted records. None is typed in.',
        gap: NO_TOUR,
      },
    ],
  },
  {
    id: 'finance',
    title: 'Inside a tour: what finance gets',
    summary: 'Show settlements, inventory balances, COGS and margin, and reorder points.',
    steps: [
      {
        page: 'tour',
        via: 'tab',
        anchor: 'tour-shows',
        title: 'Shows, tied to the GMS workbook',
        body: "Ghost 2025 was checked against GMS's own tracker workbook: $6,804,304.34 across 22 shows and 125,605 units, matching to the cent. Each row is one show's posted sales report and settlement. Next opens a show.",
        gap: NO_TOUR,
      },
      {
        page: 'show',
        anchor: 'show-settlement',
        title: 'Show settlement',
        body: 'Gross, tax, fees and net for one show, read from its settlement document. A note says when the figures are not yet posted. "Open document" goes to the source file.',
        gap: NO_SHOW,
      },
      openInventoryTab,
      {
        page: 'inventory',
        anchor: 'inv-balance',
        title: 'Balances, refreshed after each post',
        body: 'Balance = received − sold − comps, per SKU and size. It is recalculated automatically after every post, and Movements lists each receipt, sale and comp behind a balance.',
        gap: NO_TOUR,
      },
      openCogsTab,
      {
        page: 'cogs',
        anchor: 'cogs-table',
        title: 'COGS and margin, missing costs flagged',
        body: 'Revenue, cost of goods and margin per product and size, or per show. COGS = units sold × full package cost. Products sold without a unit cost are counted and flagged above, not hidden: their COGS counts as $0 until a cost is set, and the warning says margin is overstated.',
        gap: NO_TOUR,
      },
      openProjectionsTab,
      {
        page: 'projections',
        anchor: 'proj-reorder',
        fallbackAnchor: 'proj-sheet',
        title: 'Projections and reorder points',
        body: 'A forecast for the rest of the tour from sales so far, expected attendance and per head, current stock and open purchase orders. Items forecast to run out before the next delivery are listed here, with the show where stock runs short.',
        gap: 'No reorder alerts show for this tour now. The sheet forecasts the rest of the tour from sales so far, attendance, stock and open purchase orders; an item forecast to run short is listed above it.',
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reports and Business Central',
    summary: 'The Merch Flow report with its quality checks and PDF; Business Central by API (planned).',
    steps: [
      openReportsTab,
      {
        page: 'reports',
        anchor: 'bc-card',
        title: 'Business Central by API (planned)',
        body: "Posted MerchFlow records are to go to Microsoft Dynamics 365 Business Central through its REST API, so nobody re-keys sales, comps or receipts. Each record is mapped to Business Central's schema and validated first; failures go to the review queue. Every push is logged with its source document, and resending never duplicates. Status: designed, not built. Until then, Business Central entry continues as today.",
        gap: NO_TOUR,
      },
      {
        page: 'reports',
        anchor: 'merch-flow-report',
        title: 'Open the Merch Flow report',
        body: 'The same report MerchFlow Charts builds, computed by the same code from the same records: gross, units, attendance and per head. Next opens it.',
        gap: NO_TOUR,
      },
      {
        page: 'merchFlow',
        anchor: 'mf-gaps',
        fallbackAnchor: 'mf-quality',
        title: 'Gap notices and quality checks',
        body: 'The report says what is missing, such as shows with no posted sales or products with no cost, instead of filling the gap in. It also checks its own data, for example top products without a photo. Suggestions only: nothing here changes the stored records.',
        gap: NO_TOUR,
      },
      {
        page: 'merchFlow',
        anchor: 'charts-link',
        title: 'PDF for management and artists',
        body: 'Builds the A3 PDF in MerchFlow Charts with this tour already loaded. No export, no re-keying.',
        gap: NO_TOUR,
      },
    ],
  },
  {
    id: 'across',
    title: 'Across tours',
    summary: 'Gross, per head and attendance for every tour at once.',
    steps: [
      openAdmin(
        'adminAnalytics',
        'Admin, in the sidebar (Menu on a phone), covers every tour at once. Analytics is under "Across all tours" there; Next opens it.',
      ),
      {
        page: 'adminAnalytics',
        anchor: 'admin-analytics',
        title: 'Every tour at once',
        body: 'Gross, per head, shows, units and attendance across all tours, from posted sales. Tours are ranked by gross and by per head below.',
      },
    ],
  },
  {
    id: 'pos',
    title: 'MerchFlow POS',
    summary: 'Sales and comps recorded as they happen; settlements calculated. In testing.',
    steps: [
      openPos,
      {
        page: 'pos',
        anchor: 'pos-video',
        fallbackAnchor: 'pos-intro',
        title: 'MerchFlow POS, in testing',
        body: 'An iPad point of sale for the merch table. Sales and comps are recorded as they happen, stock is counted in and out per show, and the settlement is calculated, so the AtVenu export goes. Sync to the tracker and card payments (Stripe Terminal) are still to be built; today the app runs in testing.',
      },
      {
        page: 'posDemo',
        anchor: 'pos-demo-app',
        title: 'Interactive demo',
        body: "Try it on the POS page opens this clickable mock of the iPad app, using this tour's catalogue: a sale, comps and the settlement at close. Nothing is saved.",
      },
    ],
  },
  {
    id: 'summary',
    title: 'Summary',
    summary: 'Before and after: 10 → 1 → 0. What is live today and what is planned.',
    steps: [
      openWelcome,
      {
        page: 'welcome',
        anchor: 'welcome-counts',
        title: 'Before and after: 10 → 1 → 0',
        body: 'Today: 10 manual steps per show. Option A, keeping AtVenu: 1, the export after each show, plus review of flagged items. Option B, with MerchFlow POS: 0, review only.',
      },
      {
        page: 'welcome',
        anchor: 'welcome-status',
        title: 'Live today, and planned',
        body: 'Live: intake, AI extraction, GMS rule checks, review, the central database, inventory, COGS, settlements and reports. Planned: the Business Central API connection, POS sync to the tracker, and card payments. Charts and POS use the same database as the Tracker.',
        links: [
          { label: 'MerchFlow Charts', href: CHARTS_URL },
          { label: 'MerchFlow POS', href: '/pos' },
          { label: 'Data Flow', href: FLOW_URL },
        ],
      },
    ],
  },
];

/** The full walkthrough: every screen, for operations staff. */
export const FULL_CHAPTERS: Chapter[] = [
  {
    id: 'today',
    title: "Today's process",
    summary: '10 manual steps per show, two AtVenu logins, packing lists typed three times.',
    steps: [
      {
        page: 'welcome',
        anchor: 'welcome-counts',
        title: '10 manual steps per show',
        body: 'Today each show needs 10 manual steps. Two of them are logins to the AtVenu portal to download sales and comps.',
      },
      {
        page: 'welcome',
        anchor: 'flow-current-note-0',
        fallbackAnchor: 'flow-diagram',
        before: CURRENT_TAB,
        title: 'The manual steps',
        body: 'Packing lists are typed three times: into AtVenu, the Tracker and Business Central. Purchase orders are typed into the Tracker.',
      },
      {
        page: 'welcome',
        anchor: 'flow-current-note-1',
        fallbackAnchor: 'flow-diagram',
        before: CURRENT_TAB,
        title: 'Sales and comps, twice',
        body: 'Sales, settlements and comps are downloaded from AtVenu, then keyed into the Tracker and again into Business Central. The rest of the tour shows each screen and the typing it replaces.',
      },
    ],
  },
  {
    id: 'documents',
    title: 'Documents: upload, review, post',
    summary: 'One drop zone; AI extracts the fields; GMS rules check the draft; a person approves and posts.',
    steps: [
      openUpload,
      {
        page: 'upload',
        anchor: 'upload-dropzone',
        title: 'One drop zone',
        body: 'Purchase orders, packing lists, sales reports and settlements all go here. There is no separate form per document type.',
      },
      {
        page: 'upload',
        anchor: 'upload-detect',
        title: 'Type detected, saved as a draft',
        body: 'With auto-detect on, AI reads the PDF, names the document type and matches the tour and show. The extracted fields are saved as a draft; nothing is written to the tour until the draft is reviewed and posted.',
      },
      openDocuments,
      {
        page: 'documents',
        anchor: 'docs-list',
        fallbackAnchor: 'docs-filters',
        title: 'Drafts to review',
        body: 'Filter by document type and status. Each row shows the type, status, file name, and the tour and show it was matched to. Next opens a draft.',
        gap: 'No parsed documents yet. Each uploaded document appears here as a draft with its type, status, and matched tour and show.',
      },
      {
        page: 'review',
        anchor: 'review-validation',
        title: 'Business rule checks',
        body: 'GMS rules check the extracted data: SKU and size against the catalogue, required fields, line totals against the reported gross, the packing list matched to its PO, and a file already posted is not drafted again. Problems are listed here. Per-head and show-date checks are being added.',
        gap: 'There is no document to open. On a document, GMS rules check SKU and size, required fields, totals, the PO-to-packing-list match and duplicates, and list any problems.',
      },
      {
        page: 'review',
        anchor: 'review-actions',
        title: 'Fix flagged fields, then approve and post',
        body: 'The extracted fields are editable, and flagged ones, such as an unknown SKU, are marked: only those need checking. Approve & Post writes the data to the tour and refreshes inventory. Reject discards the draft. Save Draft keeps edits for later.',
        gap: 'There is no document to open. On a document, flagged fields are marked, and Approve & Post writes the data to the tour.',
      },
    ],
  },
  {
    id: 'tours',
    title: 'Tours',
    summary: 'The tour list and its totals, built from posted documents; a tour and its products.',
    steps: [
      openTours,
      {
        page: 'home',
        anchor: 'home-kpis',
        title: 'Totals across tours',
        body: 'Tours, gross sales, tour products and documents waiting for review. Each number is summed from posted documents. None is typed in.',
      },
      {
        page: 'home',
        anchor: 'tours-dashboard',
        title: 'One record per tour',
        body: 'Each tour card shows dates, shows, products and gross, built from posted purchase orders, packing lists, sales reports and settlements. Next opens a tour.',
      },
      {
        page: 'tour',
        anchor: 'tour-kpis',
        title: 'Tour totals',
        body: 'Total gross comes from posted sales reports. Per head is gross divided by attendance. Inventory balance comes from the stock ledger.',
        gap: NO_TOUR,
      },
      {
        page: 'tour',
        anchor: 'tour-products',
        title: 'Products and sell-through',
        body: 'Each product with units sold, gross and stock left. Sold next to stock left gives the sell-through for the tour so far.',
        gap: NO_TOUR,
      },
    ],
  },
  {
    id: 'show',
    title: 'A show',
    summary: 'Sales lines, comps, stock before and after, settlement.',
    steps: [
      {
        page: 'tour',
        via: 'tab',
        anchor: 'tour-shows',
        title: 'Open a show',
        body: "One row per show: date, venue, gross, per head and comps, from that show's sales report and settlement. Next opens a show.",
        gap: NO_TOUR,
      },
      {
        page: 'show',
        anchor: 'show-sales',
        title: 'Sales lines and comps',
        body: 'Units, price and gross per SKU and size, and comped items by type, such as GMS and band. These used to be typed by hand from the AtVenu downloads, after a second portal login for comps.',
        gap: NO_SHOW,
      },
      {
        page: 'show',
        anchor: 'show-inventory',
        title: 'Stock before and after',
        body: 'Starting and ending stock per item: received minus sold minus comps, up to this show. This used to be worked out by hand in the tracker sheet.',
        gap: NO_SHOW,
      },
      {
        page: 'show',
        anchor: 'show-settlement',
        title: 'Settlement',
        body: 'Gross, fees and net from the posted settlement. These used to be keyed into the Tracker and again into Business Central.',
        gap: NO_SHOW,
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    summary: 'Balance = received − sold − comps, refreshed after each post.',
    steps: [
      openInventoryTab,
      {
        page: 'inventory',
        anchor: 'inv-controls',
        title: 'Stock, filters and movements',
        body: 'Products, on hand, on order, total sold and inventory value are totalled above. Search by SKU, filter by stock level or product type. Movements lists every receipt, sale and comp behind each balance.',
        gap: NO_TOUR,
      },
      {
        page: 'inventory',
        anchor: 'inv-balance',
        title: 'Balance per item',
        body: 'Balance = received − sold − comps, per SKU and size. It is refreshed automatically after each document is posted. This replaces the hand-kept tracker sheet.',
        gap: NO_TOUR,
      },
    ],
  },
  {
    id: 'cogs',
    title: 'COGS and projections',
    summary: 'Margins per product and show; projected units and reorder points.',
    steps: [
      openCogsTab,
      {
        page: 'cogs',
        anchor: 'cogs-table',
        title: 'Cost of goods and margin',
        body: 'Revenue, cost of goods, margin and margin %, per product and size or per show. Calculated from posted sales and the product costs set for the tour.',
        gap: NO_TOUR,
      },
      openProjectionsTab,
      {
        page: 'projections',
        anchor: 'proj-reorder',
        fallbackAnchor: 'proj-sheet',
        title: 'Reorder points',
        body: 'Items forecast to run out before the next delivery are listed here, with the show where stock runs short.',
        gap: 'No reorder alerts are showing for this tour now. When an item is forecast to run short before the next delivery, it is listed above this sheet. Low stock is also marked per row in the sheet.',
      },
      {
        page: 'projections',
        anchor: 'proj-sheet',
        title: 'Projection sheet',
        body: 'Projected units per SKU and size for the rest of the tour, from sales so far, expected attendance and per head, current stock and open purchase orders. Edits are saved as a scenario.',
        gap: NO_TOUR,
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    summary: 'The Merch Flow report and sales charts, with no file upload.',
    steps: [
      openReportsTab,
      {
        page: 'reports',
        anchor: 'merch-flow-report',
        title: 'Merch Flow report',
        body: "Built from the tour's posted data: gross, units sold, per head and attendance, and more. It replaces the summary that was put together by hand in Excel. Next opens it.",
        gap: NO_TOUR,
      },
      {
        page: 'merchFlow',
        anchor: 'mf-scorecard',
        title: 'Product scorecard',
        body: 'Products ranked by units sold and by share of gross. Shift shows where the two rankings differ. Below it: category mix and 1-in-N ratios (attendees per unit sold).',
        gap: NO_TOUR,
      },
      {
        page: 'merchFlow',
        anchor: 'mf-quality',
        title: 'Data quality',
        body: 'Gaps and inconsistencies found in the data, such as missing attendance. Suggestions only. Nothing is changed.',
        gap: NO_TOUR,
      },
      {
        page: 'merchFlow',
        anchor: 'charts-link',
        title: 'Make a sales chart',
        body: 'Opens MerchFlow Charts with this tour already loaded. No spreadsheet export or file upload.',
        gap: NO_TOUR,
      },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    summary: 'Setting up a tour, the product catalog, inventory and analytics across tours.',
    steps: [
      openAdmin(
        'admin',
        'Admin, in the sidebar (Menu on a phone), is where tours and products are set up. Its Documents page counts the same documents as the Documents chapter.',
      ),
      {
        page: 'admin',
        anchor: 'admin-actions',
        title: 'Tasks',
        body: 'Shortcuts to create a tour and manage tours, products and inventory. The next steps open each.',
      },
      {
        page: 'adminNewTour',
        anchor: 'wizard-steps',
        title: 'New tour',
        body: 'Five steps: tour info, shows, products, stock and review. Schedules and product lists can be filled from a PDF, CSV or image instead of typed. Existing tours are edited under Tours.',
      },
      {
        page: 'adminProducts',
        anchor: 'admin-products',
        title: 'Product catalog',
        body: 'SKUs, descriptions and sizes. Uploaded documents are matched against this catalog, which is how SKU and size are normalized.',
      },
      {
        page: 'adminInventory',
        anchor: 'admin-inventory',
        title: 'Inventory, all tours',
        body: 'Stock on hand, low stock and out of stock across every tour.',
      },
      {
        page: 'adminAnalytics',
        anchor: 'admin-analytics',
        title: 'Analytics',
        body: 'Totals across tours, with tours ranked by gross and by per head.',
      },
    ],
  },
  {
    id: 'pos',
    title: 'MerchFlow POS',
    summary: 'The iPad point of sale (Option B). Sales and comps recorded at the table.',
    steps: [
      openPos,
      {
        page: 'pos',
        anchor: 'pos-video',
        fallbackAnchor: 'pos-intro',
        title: 'MerchFlow POS',
        body: 'The iPad point of sale in Option B, replacing AtVenu at the merch table. Sales and comps are recorded at the table and written straight to the database, so the export and the typing after it go. The demo shows setup, a sale and the show settlement.',
        gap: 'On an iPad this button opens the app. On a computer a demo video plays here.',
      },
      {
        page: 'pos',
        anchor: 'pos-demo',
        title: 'Try it',
        body: 'The interactive demo runs the app in an iPad frame: setup, a sale by card or cash, comps, and closing the show. Nothing is saved. Sync to the tracker and card payments are still to be built.',
      },
    ],
  },
  {
    id: 'summary',
    title: 'Summary',
    summary: 'Before and after: 10 → 1 → 0 manual steps.',
    steps: [
      openWelcome,
      {
        page: 'welcome',
        anchor: 'welcome-counts',
        title: 'Before and after',
        body: 'Today: 10 manual steps per show. Option A, keeping AtVenu: 1, the export per show, plus review of flagged items. Option B, with MerchFlow POS: 0, review of flagged items only.',
      },
      {
        page: 'welcome',
        anchor: 'welcome-chapters',
        title: 'Replay any chapter',
        body: 'Each chapter can be started from this list, or from Replay tour in the sidebar. Charts and POS read and write the same database as the Tracker; the Data Flow site compares the current process with Options A and B.',
        links: [
          { label: 'MerchFlow Charts', href: CHARTS_URL },
          { label: 'MerchFlow POS', href: '/pos' },
          { label: 'Data Flow', href: FLOW_URL },
        ],
      },
    ],
  },
];

export const TOURS: Record<TourId, TourDefinition> = {
  overview: {
    id: 'overview',
    label: 'Overview',
    title: 'MerchFlow overview',
    audience: '10 minutes, for leadership and finance',
    firstNumber: 1,
    chapters: OVERVIEW_CHAPTERS,
  },
  full: {
    id: 'full',
    label: 'Full walkthrough',
    title: 'Full walkthrough',
    audience: 'For operations staff',
    firstNumber: 0,
    chapters: FULL_CHAPTERS,
  },
};

export function chaptersOf(tour: TourId): Chapter[] {
  return TOURS[tour].chapters;
}

/** Builds the URL for a page, or null when it needs an id that is missing. */
export function resolvePath(page: TourPage, ids: TourIds): string | null {
  const t = ids.tourId ? `/tours/${ids.tourId}` : null;
  switch (page) {
    case 'welcome':
      return '/welcome';
    case 'home':
      return '/';
    case 'upload':
      return '/upload';
    case 'documents':
      return '/dashboard/parsed-documents';
    case 'review':
      return ids.docId ? `/dashboard/parsed-documents/${ids.docId}` : null;
    case 'tour':
      return t;
    case 'show':
      return t && ids.showId ? `${t}/shows/${ids.showId}` : null;
    case 'inventory':
      return t && `${t}/inventory`;
    case 'cogs':
      return t && `${t}/cogs`;
    case 'projections':
      return t && `${t}/projections`;
    case 'reports':
      return t && `${t}/reports`;
    case 'merchFlow':
      return t && `${t}/reports/merch-flow`;
    case 'admin':
      return '/admin';
    case 'adminTours':
      return '/admin/tours';
    case 'adminNewTour':
      return '/admin/tours/new';
    case 'adminProducts':
      return '/admin/products';
    case 'adminInventory':
      return '/admin/inventory';
    case 'adminDocuments':
      return '/admin/documents';
    case 'adminAnalytics':
      return '/admin/analytics';
    case 'pos':
      return '/pos';
    case 'posDemo':
      return '/pos/demo';
  }
}

/**
 * Where a step without its data is explained: the closest page that needs no
 * missing id (the documents list for the review page, the tours list otherwise).
 */
export function gapPath(page: TourPage): string {
  return page === 'review' ? '/dashboard/parsed-documents' : '/';
}

export function isValidPosition(pos: TourPosition): boolean {
  if (!isTourId(pos.tour)) return false;
  const chapters = chaptersOf(pos.tour);
  return (
    Number.isInteger(pos.chapter) &&
    Number.isInteger(pos.step) &&
    pos.chapter >= 0 &&
    pos.chapter < chapters.length &&
    pos.step >= 0 &&
    pos.step < chapters[pos.chapter].steps.length
  );
}

export function stepAt(pos: TourPosition): TourStep {
  return chaptersOf(pos.tour)[pos.chapter].steps[pos.step];
}

/** The next step, crossing into the next chapter; null at the end of the tour. */
export function nextPosition(pos: TourPosition): TourPosition | null {
  const chapters = chaptersOf(pos.tour);
  if (pos.step + 1 < chapters[pos.chapter].steps.length) return { ...pos, step: pos.step + 1 };
  if (pos.chapter + 1 < chapters.length) return { tour: pos.tour, chapter: pos.chapter + 1, step: 0 };
  return null;
}

/** The previous step, crossing back into the previous chapter's last step. */
export function previousPosition(pos: TourPosition): TourPosition | null {
  if (pos.step > 0) return { ...pos, step: pos.step - 1 };
  if (pos.chapter > 0) {
    const chapter = pos.chapter - 1;
    return { tour: pos.tour, chapter, step: chaptersOf(pos.tour)[chapter].steps.length - 1 };
  }
  return null;
}

/** The first step of the next chapter; null after the last chapter. */
export function nextChapter(pos: TourPosition): TourPosition | null {
  return pos.chapter + 1 < chaptersOf(pos.tour).length ? { tour: pos.tour, chapter: pos.chapter + 1, step: 0 } : null;
}

/** The chapter's display number: the overview counts from 1, the full walkthrough from 0. */
export function chapterNumber(tour: TourId, chapter: number): number {
  return chapter + TOURS[tour].firstNumber;
}

/**
 * "Overview · 3 of 8 · One database, one set of numbers" or
 * "Full walkthrough · 3 of 9 · A show" (the full walkthrough counts from 0).
 */
export function chapterLabel(tour: TourId, chapter: number): string {
  const def = TOURS[tour];
  const last = def.chapters.length - 1 + def.firstNumber;
  return `${def.label} · ${chapterNumber(tour, chapter)} of ${last} · ${def.chapters[chapter].title}`;
}

/** True when the browser is already on `path` (pathname, plus query if `path` has one). */
export function isAtPath(path: string, pathname: string, search: string): boolean {
  const [p, q] = path.split('?');
  if (p !== pathname) return false;
  return q === undefined || search.replace(/^\?/, '') === q;
}

export interface ShowOption {
  id: string;
  show_date?: string | null;
  attendance?: number | null;
  settlement_status?: string | null;
}

/** A show likely to have full data: reconciled first, then one with attendance. */
export function pickShow(shows: ShowOption[]): string | null {
  const reconciled = shows.find((s) => s.settlement_status === 'reconciled');
  if (reconciled) return reconciled.id;
  const attended = shows.find((s) => Number(s.attendance ?? 0) > 0);
  return (attended ?? shows[0])?.id ?? null;
}

export interface DocumentOption {
  id: string;
  status?: string | null;
  tour_id?: string | null;
}

/** A document for the review page: a draft (one matched to a tour first), else any. */
export function pickDocument(docs: DocumentOption[]): string | null {
  const drafts = docs.filter((d) => d.status === 'draft');
  const matched = drafts.find((d) => d.tour_id);
  return (matched ?? drafts[0] ?? docs[0])?.id ?? null;
}

/** Where a step is shown: its page's URL, or the explanation page when an id is missing. */
export function stepTarget(step: TourStep, ids: TourIds): string {
  return resolvePath(step.page, ids) ?? gapPath(step.page);
}

/** True when the step needs an id from the tour context to open its page. */
export function needsIds(step: TourStep): boolean {
  return resolvePath(step.page, { tourId: null, showId: null, docId: null }) === null;
}

/** True when the step's text uses live figures ({tokens}). */
export function needsFacts(step: TourStep): boolean {
  return /\{\w+\}/.test(`${step.title} ${step.body}`);
}
