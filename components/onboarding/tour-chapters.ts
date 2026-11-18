/**
 * The guided tours' story: two tours of chapters of steps, each step anchored
 * to a data-tour="…" element on one page. Kept free of React and the DOM so
 * the navigation rules can be unit tested.
 *
 * - `overview`: MerchFlow overview, for GMS leadership and finance (default).
 * - `full`: the full walkthrough of every screen, for operations staff.
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
  | 'pos'
  | 'posDemo';

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

export type TourId = 'overview' | 'full';

export interface TourDefinition {
  id: TourId;
  /** Short name used in the chapter label, e.g. "Overview · 3 of 10 · …". */
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

/**
 * The MerchFlow overview: one document enters once, GMS business rules check
 * it, it is written to one central database, and every report and system
 * reads from that one record.
 */
export const OVERVIEW_CHAPTERS: Chapter[] = [
  {
    id: 'today',
    title: 'Where the time and risk are today',
    summary: '10 manual steps per show, two AtVenu logins, packing lists typed three times.',
    steps: [
      {
        page: 'welcome',
        anchor: 'flow-diagram',
        title: '10 manual steps per show',
        body: 'This is the current process for one show. Each red number is a manual step: a download, a portal login, or typing the same figures again. There are 10.',
      },
      {
        page: 'welcome',
        anchor: 'flow-current-note-0',
        fallbackAnchor: 'flow-diagram',
        title: 'Two logins, three copies',
        body: 'Packing lists are typed three times: into AtVenu, the Tracker and Business Central. Comps need two separate logins to the AtVenu portal.',
      },
      {
        page: 'welcome',
        anchor: 'flow-current-note-1',
        fallbackAnchor: 'flow-diagram',
        title: 'Sales and comps keyed twice',
        body: 'Sales, settlements and comps are keyed into the Tracker and again into Business Central. The two can disagree, and sales are visible only once the typing is done.',
      },
      {
        page: 'welcome',
        anchor: 'welcome-counts',
        title: 'Each step adds delay and risk',
        body: 'Every manual step adds a delay and a chance of a keying error. The rest of this overview shows how MerchFlow takes 10 steps to 1, and to 0 with MerchFlow POS.',
      },
    ],
  },
  {
    id: 'intake',
    title: 'One intake for every document',
    summary: 'POs, packing lists, sales reports and settlements come in through one place.',
    steps: [
      {
        page: 'upload',
        anchor: 'upload-dropzone',
        title: 'One place for every document',
        body: 'Purchase orders, packing lists, sales reports and settlements all come in here. AI recognises the document type and matches it to the tour and show. There is no form per document type.',
      },
      {
        page: 'upload',
        anchor: 'upload-channels',
        fallbackAnchor: 'upload-status',
        title: 'Three ways in',
        body: 'Upload in the browser works today. An email-in address and iPad scanning at receiving are designed to feed this same intake. Every route ends in a draft, never a posted figure.',
      },
    ],
  },
  {
    id: 'rules',
    title: 'AI reads, GMS rules decide',
    summary: 'AI extracts fields only. Fixed GMS rules check them; a person approves exceptions.',
    steps: [
      {
        page: 'documents',
        anchor: 'docs-list',
        fallbackAnchor: 'docs-filters',
        title: 'Every document, with its status',
        body: 'Each upload becomes a draft here. Nothing reaches the tour, inventory or reports until a person approves it.',
        gap: 'No documents have been uploaded yet. Each upload appears here as a draft with its type and status.',
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
        body: 'Rules, not AI, check the extracted data: SKU and size against the catalogue, required fields, line totals against the reported gross, a packing list must match a known PO, and a file already posted is not drafted again. Per-head and show-date checks are being added.',
        gap: NO_DOC,
      },
      {
        page: 'review',
        anchor: 'review-actions',
        title: 'Exceptions go to a person',
        body: 'Flagged fields are marked for a person to correct. Approve and post writes the record; Reject discards it. A draft with missing required fields cannot be posted.',
        gap: NO_DOC,
      },
      {
        page: 'review',
        anchor: 'review-source',
        title: 'Every record links to its source',
        body: 'Each posted sale, comp, receipt and settlement keeps the id of the document it came from (source_doc_id). Any figure can be traced back to the original file.',
        gap: NO_DOC,
      },
    ],
  },
  {
    id: 'database',
    title: 'One database, one set of numbers',
    summary: 'Every screen after this reads the same posted records.',
    steps: [
      {
        page: 'home',
        anchor: 'tours-dashboard',
        title: 'One central database',
        body: 'Every tour is built from posted documents in one database. The Tracker, MerchFlow Charts and POS all read it. Every screen in the rest of this overview reads these same records.',
      },
      {
        page: 'tour',
        anchor: 'tour-kpis',
        title: 'Live figures: {tour}',
        body: '{gross} gross from {shows} shows with sales. {units} units sold. {perHead} per head on {attendance} attendance. Summed from posted records; none is typed in.',
        bodyWithoutFigures: 'Gross, per head, shows with sales and units on hand, summed from posted records. None is typed in.',
        gap: NO_TOUR,
      },
      {
        page: 'tour',
        anchor: 'tour-shows',
        title: 'Ties to the GMS workbook',
        body: "Ghost 2025 was checked against GMS's own tracker workbook: $6,804,304.34 across 22 shows and 125,605 units, matching to the cent. Each row here is one show's posted sales report and settlement.",
        gap: NO_TOUR,
      },
    ],
  },
  {
    id: 'finance',
    title: 'What finance gets',
    summary: 'Settlements, inventory balances, COGS and margin, and the tour report with its PDF.',
    steps: [
      {
        page: 'show',
        anchor: 'show-settlement',
        title: 'Show settlement',
        body: 'Gross, tax, fees and net for one show, read from its settlement document. A note says when the figures are not yet posted. "Open document" goes to the source file.',
        gap: 'No show is available. A show page shows its settlement: gross, tax, fees and net, with a link to the source document.',
      },
      {
        page: 'inventory',
        anchor: 'inv-balance',
        title: 'Inventory balances',
        body: 'Balance = received − sold − comps, per SKU and size. It is recalculated after every post.',
        gap: NO_TOUR,
      },
      {
        page: 'cogs',
        anchor: 'cogs-table',
        title: 'COGS and margin by product',
        body: 'Revenue, cost of goods and margin per product and size, or per show. COGS = units sold × full package cost.',
        gap: NO_TOUR,
      },
      {
        page: 'cogs',
        anchor: 'cogs-missing',
        fallbackAnchor: 'cogs-summary',
        title: 'Missing costs are flagged',
        body: 'Products sold without a unit cost are counted and flagged, not hidden. Their COGS counts as $0 until a cost is set, and the warning says margin is overstated.',
        gap: 'Every product with sales has a unit cost, so no warning shows. When a cost is missing, a warning here counts the products and says margin is overstated.',
      },
      {
        page: 'merchFlow',
        anchor: 'mf-kpis',
        title: 'The tour report',
        body: 'The same report MerchFlow Charts builds, computed by the same code from the same records: gross, units, attendance and per head.',
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
    id: 'business-central',
    title: 'Business Central, connected by API (planned)',
    summary: 'Posted records sent to Business Central by API, validated and logged. Not built yet.',
    steps: [
      {
        page: 'reports',
        anchor: 'bc-card',
        title: 'Business Central by API',
        body: 'Posted MerchFlow records go to Microsoft Dynamics 365 Business Central through its REST API, authenticated with a Microsoft Entra ID app registration. Nobody re-keys sales, comps or receipts.',
        gap: NO_TOUR,
      },
      {
        page: 'reports',
        anchor: 'bc-map',
        fallbackAnchor: 'bc-card',
        title: 'Mapped and validated first',
        body: "Before anything is sent, each record is mapped to Business Central's schema (items, purchase orders and receipts, sales and comps) and validated against it. Failures go to the review queue, not to Business Central.",
        gap: NO_TOUR,
      },
      {
        page: 'reports',
        anchor: 'bc-log',
        fallbackAnchor: 'bc-card',
        title: 'Logged, and safe to resend',
        body: 'Every push is logged with its source document. Sending a record twice does not create a duplicate, so finance can reconcile Business Central against MerchFlow line by line.',
        gap: NO_TOUR,
      },
      {
        page: 'reports',
        anchor: 'bc-status',
        fallbackAnchor: 'bc-card',
        title: 'Status: designed, not built',
        body: 'This connection is designed but not built yet. Until it is, Business Central entry continues as it is today.',
        gap: NO_TOUR,
      },
    ],
  },
  {
    id: 'controls',
    title: 'Controls and data quality',
    summary: 'Review queue, duplicate guard, automatic balances, data-gap notices and quality checks.',
    steps: [
      {
        page: 'documents',
        anchor: 'docs-list',
        fallbackAnchor: 'docs-filters',
        title: 'The review queue',
        body: 'Drafts and flagged documents wait here until someone approves or rejects them. Filter by type and status to see what is outstanding.',
        gap: 'No documents yet. Drafts and flagged documents wait here until someone approves or rejects them.',
      },
      {
        page: 'review',
        anchor: 'review-validation',
        title: 'Duplicate and re-post guard',
        body: "A file that was already posted is recognised by its fingerprint and not drafted again. Posting a show's sales again replaces them; it never adds them twice.",
        gap: NO_DOC,
      },
      {
        page: 'inventory',
        anchor: 'inv-controls',
        title: 'Balances refresh after each post',
        body: 'Inventory is recalculated automatically after every post. Movements lists each receipt, sale and comp behind a balance.',
        gap: NO_TOUR,
      },
      {
        page: 'merchFlow',
        anchor: 'mf-gaps',
        fallbackAnchor: 'mf-quality',
        title: 'Data-gap notices',
        body: 'The report says what is missing, such as shows with no posted sales or products with no cost, instead of filling the gap in.',
        gap: 'No data is missing for this tour, so no gap notices show. When something is missing, it is listed here.',
      },
      {
        page: 'merchFlow',
        anchor: 'mf-quality',
        title: 'Data-quality checks',
        body: "The report checks its own data, for example top products without a photo or inconsistent figures. Suggestions only: nothing here changes the stored records.",
        gap: NO_TOUR,
      },
    ],
  },
  {
    id: 'oversight',
    title: 'Oversight across tours',
    summary: 'Gross, per head and attendance across tours; projections and reorder points.',
    steps: [
      {
        page: 'adminAnalytics',
        anchor: 'admin-analytics',
        title: 'Every tour at once',
        body: 'Gross, per head, shows, units and attendance across all tours, from posted sales. Tours are ranked by gross and by per head below.',
      },
      {
        page: 'projections',
        anchor: 'proj-inputs',
        title: 'Projections',
        body: 'A forecast for the rest of a tour from sales so far, expected attendance and per head, current stock and open purchase orders.',
        gap: NO_TOUR,
      },
      {
        page: 'projections',
        anchor: 'proj-reorder',
        fallbackAnchor: 'proj-sheet',
        title: 'Reorder points',
        body: 'Items forecast to run out before the next delivery are listed here, with the show where stock runs short.',
        gap: 'No reorder alerts show for this tour now. When an item is forecast to run short before the next delivery, it is listed above this sheet.',
      },
    ],
  },
  {
    id: 'pos',
    title: 'Next: MerchFlow POS',
    summary: 'Sales and comps recorded as they happen; settlements calculated. In testing.',
    steps: [
      {
        page: 'pos',
        anchor: 'pos-intro',
        title: 'MerchFlow POS',
        body: 'An iPad point of sale for the merch table. It removes the AtVenu export: sales and comps are recorded as they happen.',
      },
      {
        page: 'pos',
        anchor: 'pos-features',
        title: 'Settlements calculated',
        body: 'Count-in and count-out per show, comps logged at hand-off, and the show settlement calculated from POS sales and comps.',
      },
      {
        page: 'pos',
        anchor: 'pos-status',
        title: 'Still to build',
        body: 'Sync from the POS to the tracker and card payments (Stripe Terminal) are still to be built. Today the app runs in testing.',
      },
      {
        page: 'posDemo',
        anchor: 'pos-demo-app',
        title: 'Interactive demo',
        body: "A clickable mock of the iPad app using this tour's catalogue: a sale, comps and the settlement at close. Nothing is saved.",
      },
    ],
  },
  {
    id: 'summary',
    title: 'Summary',
    summary: 'Before and after: 10 → 1 → 0. What is live today and what is planned.',
    steps: [
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
        body: 'Live: intake, AI extraction, GMS rule checks, review, the central database, inventory, COGS, settlements and reports. Planned: the Business Central API connection, POS sync to the tracker, and card payments.',
      },
      {
        page: 'welcome',
        anchor: 'app-switcher',
        fallbackAnchor: 'welcome-tours',
        title: 'Charts, POS and Data Flow',
        body: 'Charts and POS use the same database as the Tracker. The Data Flow site compares the current process with Options A and B.',
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
        body: 'Tours, gross sales, tour products and documents waiting for review. Each number is summed from posted documents. None is typed in.',
      },
      {
        page: 'home',
        anchor: 'tours-dashboard',
        title: 'One record per tour',
        body: 'Each tour card shows dates, shows, products and gross. The record is built from posted purchase orders, packing lists, sales reports and settlements.',
      },
      {
        page: 'home',
        anchor: 'home-activity',
        title: 'Recent documents and shows',
        body: 'The latest uploaded documents with their status, and the next shows on the calendar.',
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
        anchor: 'pos-demo',
        title: 'Try it',
        body: 'The interactive demo runs the app in an iPad frame: setup, a sale by card or cash, comps, and closing the show. Nothing is saved.',
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

export const DEFAULT_TOUR: TourId = 'overview';

export function isTourId(value: unknown): value is TourId {
  return value === 'overview' || value === 'full';
}

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

export interface TourPosition {
  /** Which tour; positions saved before there were two tours mean the full walkthrough. */
  tour: TourId;
  chapter: number;
  step: number;
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
 * "Overview · 3 of 10 · AI reads, GMS rules decide" or
 * "Full walkthrough · 3 of 11 · A show" (the full walkthrough counts from 0).
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
