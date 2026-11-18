/**
 * The MerchFlow data-flow diagrams, described once as data. FlowFigures.tsx
 * renders each one twice from this: a diagram for wide screens and a numbered
 * vertical list for phones. The Data Flow site
 * (gms-merch-flow-intelligence/index.html) carries a JSON copy of the same
 * data; keep the two in step.
 */

export type StageId =
  | 'sources'
  | 'capture'
  | 'ai'
  | 'rules'
  | 'review'
  | 'database'
  | 'outputs'
  | 'manual';

/** Stage colours are the --mf-stage-* tokens in app/globals.css. */
export const STAGES: Record<StageId, { label: string; note: string }> = {
  sources: { label: 'Sources', note: 'where the data starts' },
  capture: { label: 'Capture', note: 'how documents arrive' },
  ai: { label: 'AI extraction', note: 'reads only' },
  rules: { label: 'GMS business rules', note: 'deterministic' },
  review: { label: 'Review', note: 'a person checks flags' },
  database: { label: 'Database', note: 'where data is kept' },
  outputs: { label: 'Outputs', note: 'apps and exports' },
  manual: { label: 'Manual step', note: 'typed or downloaded by hand' },
};

export interface FlowItem {
  text: string;
  sub?: string;
}

export interface PipelineStage {
  stage: StageId;
  title: string;
  /** Short line under the title, e.g. "Fixed rules, no AI". */
  tag?: string;
  items: FlowItem[];
}

export interface PipelineFlow {
  kind: 'pipeline';
  title: string;
  desc: string;
  /** Left to right; the last stage is the database. */
  stages: PipelineStage[];
  /** Option B: the POS writes straight to the database. */
  branch?: {
    stage: StageId;
    title: string;
    items: FlowItem[];
    toCapture: string;
    toDatabase: string;
  };
  outputs: FlowItem[];
}

export interface TodayStep {
  /** GMS's manual step number, 1 to 10. */
  n: number;
  text: string;
}

export interface TodayFlow {
  kind: 'today';
  title: string;
  desc: string;
  /** Systems the documents are typed into, left to right. */
  systems: { id: string; title: string; sub: string }[];
  rows: {
    doc: string;
    from: string;
    /** Per system id: the manual steps in that cell, or 'source' where the data comes from. */
    cells: Record<string, TodayStep[] | 'source'>;
  }[];
}

export type Flow = PipelineFlow | TodayFlow;

export const TODAY: TodayFlow = {
  kind: 'today',
  title: 'Current tour data flow',
  desc:
    'Four kinds of document, each typed by hand into up to three systems: AtVenu, the Inventory Tracker and Business Central. Ten numbered manual steps in all.',
  systems: [
    { id: 'atvenu', title: 'AtVenu', sub: 'Point of sale' },
    { id: 'tracker', title: 'Inventory Tracker', sub: 'Sales, POs, stock, reports' },
    { id: 'bc', title: 'Business Central', sub: 'Accounting' },
  ],
  rows: [
    {
      doc: 'Purchase orders',
      from: 'From GMS, PDF. Also sent to the vendor.',
      cells: { tracker: [{ n: 2, text: 'Typed in' }] },
    },
    {
      doc: 'Packing lists',
      from: 'From the vendor, PDF',
      cells: {
        atvenu: [{ n: 1, text: 'Typed in' }],
        tracker: [{ n: 4, text: 'Typed in' }],
        bc: [{ n: 3, text: 'Typed in' }],
      },
    },
    {
      doc: 'Sales report and settlement',
      from: 'From AtVenu, PDF or xls',
      cells: {
        atvenu: 'source',
        tracker: [{ n: 5, text: 'Downloaded, typed in' }],
        bc: [{ n: 6, text: 'Downloaded, typed in' }],
      },
    },
    {
      doc: 'Comps (GMS / band)',
      from: 'From the AtVenu trailer',
      cells: {
        atvenu: 'source',
        tracker: [
          { n: 7, text: 'Log into AtVenu' },
          { n: 8, text: 'Typed in' },
        ],
        bc: [
          { n: 9, text: 'Log into AtVenu again' },
          { n: 10, text: 'Typed in' },
        ],
      },
    },
  ],
};

export const OPTION_A: PipelineFlow = {
  kind: 'pipeline',
  title: 'Option A: Keep AtVenu',
  desc:
    'Sources go through capture, AI extraction, GMS business rules and review into one database, which feeds the Tracker, Charts, Business Central and AtVenu.',
  stages: [
    {
      stage: 'sources',
      title: 'Sources',
      items: [
        { text: 'GMS purchase orders', sub: 'PDF' },
        { text: 'Vendor packing lists', sub: 'PDF or photo' },
        { text: 'AtVenu export', sub: 'Sales report and settlement' },
        { text: 'Comps (GMS / band)', sub: 'Trailer comp log' },
      ],
    },
    {
      stage: 'capture',
      title: 'Capture',
      items: [
        { text: 'Drag-and-drop upload' },
        { text: 'Email-in address' },
        { text: 'iPad scan' },
        { text: 'AtVenu export file' },
      ],
    },
    {
      stage: 'ai',
      title: 'AI extraction',
      tag: 'Reads only',
      items: [
        { text: 'Classifies the document' },
        { text: 'Extracts fields to a fixed schema' },
        { text: 'Flags low-confidence fields' },
        { text: 'Does not write to the database' },
      ],
    },
    {
      stage: 'rules',
      title: 'GMS business rules',
      tag: 'Fixed rules, no AI',
      items: [
        { text: 'SKU, size and date normalization' },
        { text: 'Size set XS–5X / OS' },
        { text: 'PO ↔ packing list match' },
        { text: 'Balance = received − sold − comps' },
        { text: 'Per-head under $5 flagged' },
        { text: 'Shows outside tour dates flagged' },
        { text: 'Duplicate / re-post guard' },
        { text: 'Reconcile to sales chart within $0.005' },
        { text: 'Units per product cross-check' },
      ],
    },
    {
      stage: 'review',
      title: 'Review',
      items: [
        { text: 'Passing documents', sub: 'Approve' },
        { text: 'Flagged documents', sub: 'Correct the field, then approve' },
      ],
    },
    {
      stage: 'database',
      title: 'One database',
      items: [{ text: 'Supabase' }, { text: 'One record per PO, delivery, sale and comp' }],
    },
  ],
  outputs: [
    { text: 'Inventory Tracker', sub: 'Sales, comps, POs, received stock, projections, COGS, reorder alerts' },
    { text: 'MerchFlow Charts', sub: 'Tour reports, grab sheets and PDFs from live data' },
    { text: 'Business Central', sub: 'Automated export or API sync, no re-keying' },
    { text: 'AtVenu', sub: 'Stock counts sent back as an import file' },
  ],
};

export const OPTION_B: PipelineFlow = {
  kind: 'pipeline',
  title: 'Option B: Replace AtVenu with MerchFlow POS',
  desc:
    'Vendor documents follow the Option A path. The MerchFlow iPad POS writes sales, comps and counts straight to the database, with no extraction step.',
  stages: [
    {
      stage: 'sources',
      title: 'Vendor documents',
      items: [
        { text: 'GMS purchase orders', sub: 'PDF' },
        { text: 'Vendor packing lists', sub: 'PDF or photo' },
      ],
    },
    {
      stage: 'capture',
      title: 'Capture',
      items: [{ text: 'Drag-and-drop upload' }, { text: 'Email-in address' }, { text: 'iPad scan' }],
    },
    {
      stage: 'ai',
      title: 'AI extraction',
      tag: 'Reads only',
      items: [
        { text: 'Vendor documents only' },
        { text: 'Extracts fields to a fixed schema' },
        { text: 'Does not write to the database' },
      ],
    },
    {
      stage: 'rules',
      title: 'GMS business rules',
      tag: 'Fixed rules, no AI',
      items: [
        { text: 'SKU, size and date normalization' },
        { text: 'PO ↔ packing list match' },
        { text: 'Balance = received − sold − comps' },
        { text: 'Per-head and tour-date checks' },
        { text: 'Duplicate / re-post guard' },
        { text: 'Count-out vs sales variance' },
        { text: 'Settlement math per show' },
      ],
    },
    {
      stage: 'review',
      title: 'Review',
      items: [{ text: 'Vendor documents' }, { text: 'Flagged count variances' }],
    },
    {
      stage: 'database',
      title: 'One database',
      items: [{ text: 'Supabase' }, { text: 'Updated per transaction' }],
    },
  ],
  branch: {
    stage: 'sources',
    title: 'MerchFlow iPad POS',
    items: [
      { text: 'Sales at the table (Stripe Terminal)' },
      { text: 'Comps logged at hand-off' },
      { text: 'Count-in and count-out per show' },
      { text: 'Packing-list scan at receiving' },
      { text: 'Offline mode, syncs when online' },
    ],
    toCapture: 'Packing-list scans',
    toDatabase: 'Sales, comps and counts: direct write, no extraction step',
  },
  outputs: [
    { text: 'Inventory Tracker', sub: 'Live stock, projections, COGS, reorder alerts' },
    { text: 'MerchFlow Charts', sub: 'Tour reports and grab sheets after each show' },
    { text: 'Business Central', sub: 'Automated export or API sync' },
    { text: 'Settlements', sub: 'Built per show from POS sales and comps' },
  ],
};

export interface FlowNote {
  title: string;
  tone?: 'manual' | 'outputs';
  ordered?: boolean;
  items: string[];
}

export type ViewId = 'current' | 'option-a' | 'option-b' | 'compare';

export interface FlowView {
  id: ViewId;
  tab: string;
  /** Manual steps left, shown as a count on the tab. */
  count?: number;
  title: string;
  intro: string;
  flow?: Flow;
  notes: FlowNote[];
}

export const MANUAL_STEPS = [
  'Packing lists typed into AtVenu',
  'Purchase orders typed into the Tracker',
  'Packing lists typed into Business Central',
  'Packing lists typed into the Tracker',
  'Sales and settlement downloaded and typed into the Tracker',
  'Sales and settlement downloaded and typed into Business Central',
  'Log into AtVenu for comps',
  'Comps typed into the Tracker',
  'Log into AtVenu again',
  'Comps typed into Business Central',
];

export const VIEWS: FlowView[] = [
  {
    id: 'current',
    tab: 'Current',
    count: 10,
    title: 'Current tour data flow',
    intro: 'Each red number is a manual step: a download, a portal login or typing the same data again.',
    flow: TODAY,
    notes: [
      { title: 'Manual steps', tone: 'manual', ordered: true, items: MANUAL_STEPS },
      {
        title: 'Effects',
        items: [
          'Packing lists are typed three times',
          'Sales and comps are entered into two systems separately',
          'Sales data is available only after downloads are entered',
          'Reports, grab sheets and sales charts are built by hand in Excel',
        ],
      },
    ],
  },
  {
    id: 'option-a',
    tab: 'Option A · Keep AtVenu',
    count: 1,
    title: 'Option A: Keep AtVenu',
    intro:
      'Documents are uploaded once. AI extracts the fields, GMS business rules check them, flagged items go to review, and the data is written to one database used by every system.',
    flow: OPTION_A,
    notes: [
      {
        title: 'Remaining manual steps',
        tone: 'outputs',
        ordered: true,
        items: [
          'Export the sales report and settlement from AtVenu after each show (or schedule the export)',
          'Review and approve flagged documents',
        ],
      },
      {
        title: 'Removed',
        items: [
          'Manual entry into the Tracker and Business Central',
          'Both AtVenu portal logins for comps',
          'Duplicate packing list entry (3 times to 1)',
          'Manual report and grab sheet builds',
        ],
      },
      {
        title: 'Still to build',
        items: [
          'Business Central export',
          'AtVenu stock-count import file',
          'Email-in capture address',
          'Review queue for flagged exceptions',
        ],
      },
    ],
  },
  {
    id: 'option-b',
    tab: 'Option B · MerchFlow POS',
    count: 0,
    title: 'Option B: Replace AtVenu with MerchFlow POS',
    intro:
      'Sales, comps and stock counts are recorded in the MerchFlow iPad app and written straight to the database. Vendor documents follow the Option A path.',
    flow: OPTION_B,
    notes: [
      {
        title: 'Remaining manual steps',
        tone: 'outputs',
        items: ['Review and approve flagged vendor documents', 'Resolve count-out variances at settlement'],
      },
      {
        title: 'Differences from current',
        items: [
          'No AtVenu portal access, exports or fees',
          'Sales data available per transaction',
          'Settlements calculated by the system',
        ],
      },
      {
        title: 'Still to build',
        items: [
          'Everything in Option A, apart from the AtVenu import',
          'Card payments through Stripe Terminal (MerchFlow phase 4)',
          'Offline sync to the database (MerchFlow phase 5)',
          'Pilot on one tour leg alongside AtVenu',
        ],
      },
    ],
  },
  {
    id: 'compare',
    tab: 'Compare',
    title: 'Comparison',
    intro: 'The current process and both options, side by side.',
    notes: [],
  },
];

/** The three summary tiles: manual steps per option. */
export const TILES: { count: number; label: string; body: string; tone: StageId }[] = [
  { count: 10, label: 'Today', body: 'manual steps, including 2 AtVenu portal logins', tone: 'manual' },
  { count: 1, label: 'Option A', body: 'the AtVenu export per show, plus review of flagged items', tone: 'review' },
  { count: 0, label: 'Option B', body: 'no manual entry; review of flagged items only', tone: 'outputs' },
];

export const COMPARE: { columns: [string, string, string]; rows: { label: string; values: [string, string, string] }[] } = {
  columns: ['Current', 'Option A · Keep AtVenu', 'Option B · MerchFlow POS'],
  rows: [
    { label: 'Manual touch points', values: ['10', '1 export per show, plus exceptions', 'Exceptions only'] },
    { label: 'AtVenu portal logins', values: ['2 per cycle', 'None (scheduled export)', 'None (AtVenu not used)'] },
    { label: 'Packing lists entered', values: ['3 times, by hand', 'Once, by scan or upload', 'Once, scanned at receiving'] },
    { label: 'Sales and comps into Business Central', values: ['Re-keyed', 'Automated export', 'Automated export'] },
    { label: 'When sales are visible', values: ['Days later', 'Same day', 'Live'] },
    { label: 'Settlements', values: ['Downloaded, re-keyed', 'Read from the AtVenu export', 'Built from POS data'] },
    { label: 'Reports and grab sheets', values: ['Built in Excel', 'Live from the database', 'Live from the database'] },
    { label: 'What AI does', values: ['Nothing', 'Reads documents only', 'Reads vendor documents only'] },
    { label: 'Risks', values: ['Entry errors; systems out of sync', 'Depends on AtVenu export format', 'New POS hardware; offline sync'] },
  ],
};

export const AI_NOTE =
  'AI is used only to extract fields from documents, because document layouts vary. Validation, inventory balances and settlement calculations use fixed GMS business rules. Data is written to the database only after the rules pass and, for flagged items, after review.';
