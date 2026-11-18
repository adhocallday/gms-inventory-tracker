'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CurrentFlowSvg, OptionAFlowSvg, OptionBFlowSvg } from './flow-svgs';

/**
 * Current process vs Option A vs Option B, with the diagrams and copy from the
 * Data Flow site (gms-merch-flow-intelligence/index.html).
 */

type ViewId = 'current' | 'option-a' | 'option-b';

const VIEWS: {
  id: ViewId;
  tab: string;
  title: string;
  intro: string;
  Svg: () => JSX.Element;
  notes: { title: string; tone?: 'warn' | 'ok'; ordered?: boolean; items: string[] }[];
}[] = [
  {
    id: 'current',
    tab: 'Current',
    title: 'Current tour data flow',
    intro: 'Red numbers mark manual steps: downloads, portal logins and re-entry.',
    Svg: CurrentFlowSvg,
    notes: [
      {
        title: 'Manual steps',
        tone: 'warn',
        ordered: true,
        items: [
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
        ],
      },
      {
        title: 'Effects',
        items: [
          'Packing lists are typed three times',
          'Sales and comps are entered into two systems separately',
          'Sales data is available only after downloads are entered',
          'Reports, grab sheets and sales charts are built manually in Excel',
        ],
      },
    ],
  },
  {
    id: 'option-a',
    tab: 'Option A · Keep AtVenu',
    title: 'Option A: Keep AtVenu',
    intro:
      'Documents are uploaded once. AI extracts the fields, GMS business rules validate them, flagged items go to review, and the data is written to one database used by all systems.',
    Svg: OptionAFlowSvg,
    notes: [
      {
        title: 'Remaining manual steps',
        tone: 'ok',
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
    ],
  },
  {
    id: 'option-b',
    tab: 'Option B · MerchFlow POS',
    title: 'Option B: Replace AtVenu with MerchFlow POS',
    intro:
      'Sales, comps and stock counts are recorded in the MerchFlow iPad app and written directly to the database. Vendor documents follow the same process as Option A.',
    Svg: OptionBFlowSvg,
    notes: [
      {
        title: 'Remaining manual steps',
        tone: 'ok',
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
    ],
  },
];

export function FlowDiagrams() {
  const [active, setActive] = useState<ViewId>('current');
  const view = VIEWS.find((v) => v.id === active)!;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Data flow views" className="flex flex-wrap gap-1 border-b-2 border-[var(--color-text-primary)]">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={v.id === active}
            onClick={() => setActive(v.id)}
            className={cn(
              'px-3 py-2 text-sm font-semibold rounded-t-md transition',
              v.id === active
                ? 'bg-[var(--color-red-primary)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            {v.tab}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{view.title}</h3>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-3xl">{view.intro}</p>
        </div>
        <div className="mf-flow" data-tour="flow-diagram">
          <view.Svg />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {view.notes.map((note, index) => {
            const List = note.ordered ? 'ol' : 'ul';
            return (
              <div
                key={note.title}
                data-tour={`flow-${view.id}-note-${index}`}
                className={cn(
                  'rounded-lg border p-4 bg-[var(--color-bg-surface)]',
                  note.tone === 'warn'
                    ? 'border-[var(--color-red-primary)]'
                    : note.tone === 'ok'
                      ? 'border-[#00A36F]'
                      : 'border-[var(--color-bg-border)]'
                )}
              >
                <h4 className="text-sm font-semibold mb-2">{note.title}</h4>
                <List className={cn('pl-5 space-y-1 text-sm text-[var(--color-text-secondary)]', note.ordered ? 'list-decimal' : 'list-disc')}>
                  {note.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </List>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
