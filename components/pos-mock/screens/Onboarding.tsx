'use client';

import { MerchFlowWordmark } from '@/components/brand/MerchFlowLogo';
import { Card, DemoBadge, Footer, PrimaryButton, SecondaryButton, StepTitle } from '../ui';
import type { Action } from '../state';
import type { Dispatch } from 'react';

type Go = Dispatch<Action>;

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-[var(--red)]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const FACTS = [
  {
    icon: 'M3 6h18v12H3zM3 10h18M7 15h2',
    title: 'Sales are recorded at the table',
    detail: 'Each cash, card or split sale is saved on this iPad as it happens, with item, size, price and tax.',
  },
  {
    icon: 'M14 3H6v18h12V7zM14 3v4h4M12 10v7M9 14l3 3 3-3',
    title: 'No portal downloads or re-entry',
    detail: 'Sales and counts are stored with the show in MerchFlow. There is no portal report to download and type into the tracker.',
  },
  {
    icon: 'M15 3H6v18h7M15 3l3 3v5M9 8h5M9 12h3M17 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M19.5 19.5L22 22',
    title: 'Settlement is calculated by the app',
    detail: 'Opening count, sales and closing count produce the show totals and the cash drawer check.',
  },
];

export function WelcomeScreen({ dispatch }: { dispatch: Go }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-8 overflow-y-auto px-10 pt-8">
        <div className="space-y-4">
          <MerchFlowWordmark className="h-11 w-auto text-[var(--ink)]" />
          <StepTitle title="Set up MerchFlow POS" subtitle="This takes a few minutes. You can run it again later from Settings." />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {FACTS.map((f) => (
            <Card key={f.title} className="space-y-3 p-6">
              <Icon d={f.icon} />
              <h3 className="text-[20px] font-semibold leading-snug">{f.title}</h3>
              <p className="text-[16px] leading-snug text-[var(--text2)]">{f.detail}</p>
            </Card>
          ))}
        </div>
      </div>
      <Footer
        secondary={
          <SecondaryButton onClick={() => dispatch({ type: 'go', screen: 'register' })}>Skip to POS</SecondaryButton>
        }
        primary={<PrimaryButton onClick={() => dispatch({ type: 'go', screen: 'mode' })}>Get started</PrimaryButton>}
      />
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="mt-[3px] h-4 w-4 shrink-0 text-[var(--text2)]" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export function ModeScreen({ dispatch }: { dispatch: Go }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-7 overflow-y-auto px-10 pt-8">
        <StepTitle
          title="How will you use this iPad?"
          subtitle="Demo mode uses sample data and simulated card payments. Nothing is sent to GMS."
        />
        <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Mode">
          <div role="radio" aria-checked="false" aria-disabled="true" aria-label="Live tour (not available in this mock)">
            <Card className="h-full space-y-3 p-6 opacity-60">
              <Icon d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 11a7 7 0 0 1-14 0M12 18v4" />
              <h3 className="text-[22px] font-bold">Live tour</h3>
              <ul className="space-y-2 text-[16px] text-[var(--text2)]">
                {['Connect to a tour and show in GMS', 'Set vendor and admin PINs', 'Import products from AtVenu (optional)', 'Count in stock for the show'].map((l) => (
                  <li key={l} className="flex gap-2">
                    <Check />
                    {l}
                  </li>
                ))}
              </ul>
              <p className="text-[15px] font-medium text-[var(--muted)]">Not available in this browser mock</p>
            </Card>
          </div>
          <div role="radio" aria-checked="true" aria-label="Demo, selected">
            <Card selected className="h-full space-y-3 p-6">
              <div className="flex items-center justify-between">
                <Icon d="M3 5h18v14H3zM10 9l5 3-5 3z" />
                <DemoBadge />
              </div>
              <h3 className="text-[22px] font-bold">Demo</h3>
              <ul className="space-y-2 text-[16px] text-[var(--text2)]">
                {['Tour catalog from the tracker', 'Card payments are simulated', 'Make sales with cash, card or split', 'See the settlement they produce'].map((l) => (
                  <li key={l} className="flex gap-2">
                    <Check />
                    {l}
                  </li>
                ))}
              </ul>
              <p className="text-[15px] font-semibold text-[var(--red)]">Selected</p>
            </Card>
          </div>
        </div>
      </div>
      <Footer
        onBack={() => dispatch({ type: 'go', screen: 'welcome' })}
        secondary={<SecondaryButton onClick={() => dispatch({ type: 'go', screen: 'register' })}>Skip to POS</SecondaryButton>}
        primary={<PrimaryButton onClick={() => dispatch({ type: 'go', screen: 'atvenu-compare' })}>Start demo</PrimaryButton>}
      />
    </div>
  );
}

const COMPARE = [
  ['Product list', 'Set up in the AtVenu portal', 'Imported once from an AtVenu CSV export, or pulled from the GMS tracker'],
  ['Recording a sale', 'AtVenu app at the stand', 'MerchFlow POS at the stand: cash, card or split'],
  ['Getting sales to GMS', 'Download a report from the portal, then enter it in the tracker', 'Sales are stored with the show on the iPad. Upload to the tracker is planned and not built yet'],
  ['Counts', 'Kept in the portal or on paper', 'Count-in and count-out on the iPad, per item and size'],
  ['Settlement', 'Built from the downloaded report', 'Calculated from counts and sales, with a cash drawer check'],
  ['Card payments', 'AtVenu’s processor and readers', 'Stripe Terminal (reader pairing not yet available; cash and manual card entry work now)'],
];

export function AtVenuCompareScreen({ dispatch }: { dispatch: Go }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-10 pt-8">
        <StepTitle title="Switching from AtVenu" subtitle="What changes for the stand and for settlement." />
        <Card className="overflow-hidden">
          <table className="w-full text-left text-[15px]">
            <thead className="bg-[var(--surface)]">
              <tr>
                <th scope="col" className="w-[200px] px-5 py-3"><span className="sr-only">Topic</span></th>
                <th scope="col" className="px-5 py-3 font-semibold">AtVenu today</th>
                <th scope="col" className="px-5 py-3 font-semibold text-[var(--red)]">MerchFlow POS</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([topic, a, m]) => (
                <tr key={topic} className="border-t border-[var(--border)] align-top">
                  <th scope="row" className="px-5 py-3 font-semibold">{topic}</th>
                  <td className="px-5 py-3 text-[var(--text2)]">{a}</td>
                  <td className="px-5 py-3">{m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <Footer
        onBack={() => dispatch({ type: 'go', screen: 'mode' })}
        secondary={<SecondaryButton onClick={() => dispatch({ type: 'go', screen: 'register' })}>Skip import</SecondaryButton>}
        primary={<PrimaryButton onClick={() => dispatch({ type: 'go', screen: 'atvenu-mapping' })}>See the import</PrimaryButton>}
      />
    </div>
  );
}

/** First rows of the iOS sample file, atvenu-sample.csv. */
const CSV_HEADERS = ['Item', 'SKU', 'Size', 'Price', 'Qty', 'Category'];
const CSV_ROWS = [
  ['Skeletour Itin Tee', 'GHO-ITIN-BK-S', 'S', '$45.00', '24', 'Apparel'],
  ['Skeletour Itin Tee', 'GHO-ITIN-BK-M', 'M', '$45.00', '48', 'Apparel'],
  ['Skeletour Itin Tee', 'GHO-ITIN-BK-3XL', '3XL', '$50.00', '12', 'Apparel'],
  ['Batwing Hoodie', 'GHO-BATW-BK-M', 'M', '$80.00', '20', 'Apparel'],
];
const FIELDS: { label: string; column: string; required?: boolean }[] = [
  { label: 'Item name', column: 'Item', required: true },
  { label: 'SKU', column: 'SKU' },
  { label: 'Size', column: 'Size' },
  { label: 'Price', column: 'Price', required: true },
  { label: 'Quantity', column: 'Qty' },
  { label: 'Category', column: 'Category' },
];

export function AtVenuMappingScreen({ dispatch }: { dispatch: Go }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-10 pt-8">
        <StepTitle
          title="Match columns"
          subtitle="Columns were matched by header name. Change any that are wrong. Item name and Price are required."
        />
        <div className="grid grid-cols-[1fr_1.25fr] gap-5 group-data-[o=portrait]:grid-cols-1">
          <div className="space-y-2">
            <p className="text-[14px] text-[var(--muted)]">atvenu-sample.csv · 11 rows · 6 columns</p>
            <Card className="overflow-hidden">
              <table className="w-full text-left text-[15px]">
                <thead className="bg-[var(--surface)]">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">MerchFlow field</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">CSV column</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELDS.map((f) => (
                    <tr key={f.label} className="border-t border-[var(--border)]">
                      <th scope="row" className="px-4 py-2.5 font-normal">
                        {f.label} {f.required && <span className="text-[12px] text-[var(--red)]">required</span>}
                      </th>
                      <td className="px-4 py-2.5 text-[var(--red)]">{f.column} ⌃⌄</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
          <div className="space-y-2">
            <p className="text-[14px] text-[var(--muted)]">Sample rows from the AtVenu export</p>
            <Card className="overflow-hidden">
              <table className="w-full text-left font-mono text-[14px]">
                <thead className="bg-[var(--surface)] font-sans">
                  <tr>
                    {CSV_HEADERS.map((h) => (
                      <th key={h} scope="col" className="px-3 py-2.5 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CSV_ROWS.map((r) => (
                    <tr key={r[1]} className="border-t border-[var(--border)] text-[var(--text2)]">
                      {r.map((c, i) => (
                        <td key={i} className="px-3 py-2.5">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <p className="text-[14px] leading-snug text-[var(--text2)]">
              Rows with the same item name become one item with a size for each row. This mock shows the
              mapping only; its register uses the tour catalog from the tracker.
            </p>
          </div>
        </div>
      </div>
      <Footer
        onBack={() => dispatch({ type: 'go', screen: 'atvenu-compare' })}
        primary={<PrimaryButton onClick={() => dispatch({ type: 'go', screen: 'register' })}>Open the register</PrimaryButton>}
      />
    </div>
  );
}
