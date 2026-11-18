/**
 * The guided tour's story: chapters of steps, each anchored to a
 * data-tour="…" element on one page. Kept free of React and the DOM so the
 * navigation rules can be unit tested.
 */

import { CHARTS_URL, FLOW_URL } from '@/lib/apps';

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
  | 'pos';

export interface TourIds {
  tourId: string | null;
  showId: string | null;
  docId: string | null;
}

export interface TourStep {
  page: TourPage;
  /** data-tour value to highlight. Omitted: a centred popover with no highlight. */
  anchor?: string;
  /** Highlighted instead when the anchor is absent (for example, no rows to show). */
  fallbackAnchor?: string;
  title: string;
  body: string;
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

const NO_TOUR =
  'There are no tours in the tracker yet, so this page cannot be opened. Tours are created under Admin, then filled from uploaded documents.';

export const CHAPTERS: Chapter[] = [
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
        title: 'The manual steps',
        body: 'Packing lists are typed three times: into AtVenu, the Tracker and Business Central. Purchase orders are typed into the Tracker.',
      },
      {
        page: 'welcome',
        anchor: 'flow-current-note-1',
        fallbackAnchor: 'flow-diagram',
        title: 'Sales and comps, twice',
        body: 'Sales, settlements and comps are downloaded from AtVenu, then keyed into the Tracker and again into Business Central.',
      },
      {
        page: 'welcome',
        anchor: 'welcome-ai',
        title: 'Where AI is used',
        body: 'AI only reads documents and extracts fields. Checks, balances and settlements use fixed GMS business rules. The rest of the tour shows each screen and the typing it replaces.',
      },
    ],
  },
  {
    id: 'tours',
    title: 'Tours',
    summary: 'The tour list and its totals, built from posted documents.',
    steps: [
      {
        page: 'home',
        anchor: 'home-kpis',
        title: 'Totals across tours',
        body: 'Tours tracked, total gross sales, active tour products and documents waiting for review. Each number is summed from posted documents. None is typed in.',
      },
      {
        page: 'home',
        anchor: 'home-activity',
        title: 'Recent documents and shows',
        body: 'The latest uploaded documents with their status, and the next shows on the calendar.',
      },
      {
        page: 'home',
        anchor: 'tours-dashboard',
        title: 'One record per tour',
        body: 'Each tour card shows dates, shows, products and gross. The record is built from posted purchase orders, packing lists, sales reports and settlements.',
      },
    ],
  },
  {
    id: 'tour',
    title: 'A tour',
    summary: 'Show list, totals and sell-through, and where each number comes from.',
    steps: [
      {
        page: 'tour',
        anchor: 'tour-kpis',
        title: 'Tour totals',
        body: 'Total gross comes from posted sales reports. Per head is gross divided by attendance. Inventory balance comes from the stock ledger.',
        gap: NO_TOUR,
      },
      {
        page: 'tour',
        anchor: 'tour-shows',
        title: 'Shows',
        body: "One row per show: date, venue, gross, per head and comps. Each row comes from that show's sales report and settlement.",
        gap: NO_TOUR,
      },
      {
        page: 'tour',
        anchor: 'tour-products',
        title: 'Products and sell-through',
        body: 'Each product with units sold, gross and stock left. Sold next to stock left gives the sell-through for the tour so far.',
        gap: NO_TOUR,
      },
      {
        page: 'tour',
        anchor: 'tour-tabs',
        title: 'Tour pages',
        body: 'Projections, reports, inventory, COGS, product costs and warehouse settings for this tour. Later chapters open them.',
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
        page: 'show',
        anchor: 'show-sales',
        title: 'Sales lines',
        body: 'Units, price and gross per SKU and size. These used to be typed by hand from the AtVenu sales download.',
        gap: 'No show is available for this tour. A show page lists its sales lines: units, price and gross per SKU and size, taken from the posted sales report.',
      },
      {
        page: 'show',
        anchor: 'show-comps',
        title: 'Comps',
        body: 'Comped items by type, such as GMS and band. These used to be copied from the AtVenu comp report, after a second portal login.',
        gap: 'No show is available. A show page lists comps by type, taken from the posted sales report or settlement.',
      },
      {
        page: 'show',
        anchor: 'show-inventory',
        title: 'Stock before and after',
        body: 'Starting and ending stock per item: received minus sold minus comps, up to this show. This used to be worked out by hand in the tracker sheet.',
        gap: 'No show is available. A show page shows starting and ending stock per item for that show.',
      },
      {
        page: 'show',
        anchor: 'show-settlement',
        title: 'Settlement',
        body: 'Gross, fees and net from the posted settlement. These used to be keyed into the Tracker and again into Business Central.',
        gap: 'No show is available. A show page shows the settlement: gross, fees and net.',
      },
    ],
  },
  {
    id: 'upload',
    title: 'Getting documents in',
    summary: 'One drop zone for every document type. AI extracts the fields.',
    steps: [
      {
        page: 'upload',
        anchor: 'upload',
        title: 'Upload, from any page',
        body: 'The Upload button in the sidebar opens this page.',
      },
      {
        page: 'upload',
        anchor: 'upload-dropzone',
        title: 'One drop zone',
        body: 'Purchase orders, packing lists, sales reports and settlements all go here. There is no separate form per document type.',
      },
      {
        page: 'upload',
        anchor: 'upload-detect',
        title: 'Type detected from the file',
        body: 'With auto-detect on, AI reads the PDF, names the document type and matches the tour and show.',
      },
      {
        page: 'upload',
        anchor: 'upload-status',
        title: 'A draft, not a post',
        body: 'The extracted fields are saved as a draft. Nothing is written to the tour until the draft is reviewed and posted.',
      },
    ],
  },
  {
    id: 'review',
    title: 'Review',
    summary: 'GMS business rules check each draft. Flagged fields, then approve and post.',
    steps: [
      {
        page: 'documents',
        anchor: 'docs-filters',
        title: 'Every parsed document',
        body: 'Filter by document type and status. Drafts wait here until someone approves them.',
      },
      {
        page: 'documents',
        anchor: 'docs-list',
        fallbackAnchor: 'docs-filters',
        title: 'Drafts to review',
        body: 'Each row shows the document type, status, file name, and the tour and show it was matched to.',
        gap: 'No parsed documents yet. Each uploaded document appears here as a draft with its type, status, and matched tour and show.',
      },
      {
        page: 'review',
        anchor: 'review-validation',
        title: 'Business rule checks',
        body: 'GMS rules check the extracted data: SKU and size normalization, packing list matched to its PO, duplicate document guard, per-head and show date checks. Problems are listed here.',
        gap: 'There is no document to open. On a document, GMS rules check SKU and size normalization, the PO-to-packing-list match, duplicates, per head and dates, and list any problems.',
      },
      {
        page: 'review',
        anchor: 'review-form',
        title: 'Extracted fields',
        body: 'The fields AI extracted, editable. Flagged fields, such as an unknown SKU, are marked. Only those need checking.',
        gap: 'There is no document to open. On a document, the extracted fields are shown here with flagged ones marked.',
      },
      {
        page: 'review',
        anchor: 'review-actions',
        title: 'Approve and post',
        body: 'Approve & Post writes the data to the tour and refreshes inventory. Reject discards the draft. Save Draft keeps edits for later.',
        gap: 'There is no document to open. On a document, Approve & Post writes the data to the tour.',
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    summary: 'Balance = received − sold − comps, refreshed after each post.',
    steps: [
      {
        page: 'inventory',
        anchor: 'inv-summary',
        title: 'Stock for the tour',
        body: 'Products, on hand, on order, total sold and inventory value.',
        gap: NO_TOUR,
      },
      {
        page: 'inventory',
        anchor: 'inv-controls',
        title: 'Filters and movements',
        body: 'Search by SKU, filter by stock level or product type. Movements lists every receipt, sale and comp behind each balance.',
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
      {
        page: 'cogs',
        anchor: 'cogs-summary',
        title: 'Cost of goods',
        body: 'Revenue, cost of goods, margin and margin %. Calculated from posted sales and the product costs set for the tour.',
        gap: NO_TOUR,
      },
      {
        page: 'cogs',
        anchor: 'cogs-table',
        title: 'By product or by show',
        body: 'The same figures per product and size, or per show.',
        gap: NO_TOUR,
      },
      {
        page: 'projections',
        anchor: 'proj-inputs',
        title: 'Projection inputs',
        body: 'Projections are based on sales so far, expected attendance and per head, current stock and open purchase orders.',
        gap: NO_TOUR,
      },
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
        body: 'Projected units per SKU and size for the rest of the tour. Edits are saved as a scenario.',
        gap: NO_TOUR,
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    summary: 'The Merch Flow report and sales charts, with no file upload.',
    steps: [
      {
        page: 'reports',
        anchor: 'merch-flow-report',
        title: 'Merch Flow report',
        body: "Built from the tour's posted data. It replaces the summary that was put together by hand in Excel.",
        gap: NO_TOUR,
      },
      {
        page: 'merchFlow',
        anchor: 'mf-kpis',
        title: 'Headline figures',
        body: 'Gross, units sold, per head and attendance for the tour.',
        gap: NO_TOUR,
      },
      {
        page: 'merchFlow',
        anchor: 'mf-figures',
        fallbackAnchor: 'mf-kpis',
        title: 'Key figures',
        body: "Short facts drawn from the data, such as the top items' share of units or the best show against the average.",
        gap: 'Key figures appear here once shows have sales posted.',
      },
      {
        page: 'merchFlow',
        anchor: 'mf-scorecard',
        title: 'Product scorecard',
        body: 'Products ranked by units sold and by share of gross. Shift shows where the two rankings differ.',
        gap: NO_TOUR,
      },
      {
        page: 'merchFlow',
        anchor: 'mf-category',
        title: 'Category mix',
        body: 'Share of units sold by category.',
        gap: NO_TOUR,
      },
      {
        page: 'merchFlow',
        anchor: 'mf-ratios',
        title: '1-in-N ratios',
        body: 'Attendees per unit sold, per product. 1 in 16 means one sale for every 16 people. Worked out from sales and attendance, not by hand.',
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
    summary: 'Setting up a tour, the product catalog, system-wide inventory and documents.',
    steps: [
      {
        page: 'admin',
        anchor: 'admin-stats',
        title: 'Admin',
        body: 'Totals across the system: tours, active tours, shows and products.',
      },
      {
        page: 'admin',
        anchor: 'admin-actions',
        title: 'Quick actions',
        body: 'Shortcuts to create a tour and manage tours, products and inventory.',
      },
      {
        page: 'adminTours',
        anchor: 'admin-tours',
        title: 'Tours',
        body: 'Every tour, with its show count. Edit dates, add shows and set product costs from here.',
      },
      {
        page: 'adminNewTour',
        anchor: 'wizard-steps',
        title: 'New tour',
        body: 'Five steps: tour info, shows, products, stock and review. Schedules and product lists can be filled from a PDF, CSV or image instead of typed.',
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
        page: 'adminDocuments',
        anchor: 'admin-documents',
        title: 'Documents, all tours',
        body: 'Counts of documents by status across the system: draft, posted, rejected and errors.',
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
      {
        page: 'pos',
        anchor: 'pos-intro',
        title: 'MerchFlow POS',
        body: 'The iPad point of sale in Option B. It replaces AtVenu at the merch table.',
      },
      {
        page: 'pos',
        anchor: 'pos-video',
        fallbackAnchor: 'pos-intro',
        title: 'Demo',
        body: 'A recorded walkthrough: setup, a sale at the table and the show settlement.',
        gap: 'On an iPad this button opens the app. On a computer a demo video plays here.',
      },
      {
        page: 'pos',
        anchor: 'pos-features',
        title: 'No export step',
        body: 'Sales and comps are recorded at the table and written straight to the database. The AtVenu export and the typing after it are gone.',
      },
    ],
  },
  {
    id: 'summary',
    title: 'Summary',
    summary: 'Before and after: 10 → 1 → 0 manual steps.',
    steps: [
      {
        page: 'welcome',
        anchor: 'welcome-counts',
        title: 'Before and after',
        body: 'Today: 10 manual steps per show. Option A, keeping AtVenu: 1, the export per show, plus review of flagged items. Option B, with MerchFlow POS: 0, review of flagged items only.',
      },
      {
        page: 'welcome',
        anchor: 'app-switcher',
        title: 'The other apps',
        body: 'Charts and POS read and write the same database as the Tracker. The Data Flow site compares the current process with Options A and B.',
        links: [
          { label: 'MerchFlow Charts', href: CHARTS_URL },
          { label: 'MerchFlow POS', href: '/pos' },
          { label: 'Data Flow', href: FLOW_URL },
        ],
      },
      {
        page: 'welcome',
        anchor: 'welcome-chapters',
        title: 'Replay any chapter',
        body: 'Each chapter can be started from this list, or from Replay tour in the sidebar.',
      },
    ],
  },
];

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
  }
}

/**
 * Where a step without its data is explained: the closest page that needs no
 * missing id (the documents list for the review page, the tours list otherwise).
 */
export function gapPath(page: TourPage): string {
  return page === 'review' ? '/dashboard/parsed-documents' : '/';
}

export interface TourPosition {
  chapter: number;
  step: number;
}

export function isValidPosition(pos: TourPosition): boolean {
  return (
    Number.isInteger(pos.chapter) &&
    Number.isInteger(pos.step) &&
    pos.chapter >= 0 &&
    pos.chapter < CHAPTERS.length &&
    pos.step >= 0 &&
    pos.step < CHAPTERS[pos.chapter].steps.length
  );
}

/** The next step, crossing into the next chapter; null at the end of the tour. */
export function nextPosition(pos: TourPosition): TourPosition | null {
  if (pos.step + 1 < CHAPTERS[pos.chapter].steps.length) return { ...pos, step: pos.step + 1 };
  if (pos.chapter + 1 < CHAPTERS.length) return { chapter: pos.chapter + 1, step: 0 };
  return null;
}

/** The previous step, crossing back into the previous chapter's last step. */
export function previousPosition(pos: TourPosition): TourPosition | null {
  if (pos.step > 0) return { ...pos, step: pos.step - 1 };
  if (pos.chapter > 0) {
    const chapter = pos.chapter - 1;
    return { chapter, step: CHAPTERS[chapter].steps.length - 1 };
  }
  return null;
}

/** The first step of the next chapter; null after the last chapter. */
export function nextChapter(pos: TourPosition): TourPosition | null {
  return pos.chapter + 1 < CHAPTERS.length ? { chapter: pos.chapter + 1, step: 0 } : null;
}

/** "3 of 11 · A show": chapters are numbered from 0, the way the story is told. */
export function chapterLabel(chapter: number): string {
  return `${chapter} of ${CHAPTERS.length - 1} · ${CHAPTERS[chapter].title}`;
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
