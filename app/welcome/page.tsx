import type { Metadata } from 'next';
import { BarChart3, LayoutGrid, Tablet } from 'lucide-react';
import { MerchFlowWordmark } from '@/components/brand/MerchFlowLogo';
import { FlowDiagrams } from '@/components/onboarding/FlowDiagrams';
import { FlowTiles } from '@/components/onboarding/FlowFigures';
import { AI_NOTE } from '@/components/onboarding/flow-data';
import { WelcomeActions } from '@/components/onboarding/WelcomeActions';
import { TourChapterList } from '@/components/onboarding/TourChapterList';
import { CHARTS_URL, FLOW_URL } from '@/lib/apps';

export const metadata: Metadata = { title: 'How MerchFlow works · MerchFlow Tracker' };

const APPS = [
  {
    name: 'MerchFlow Tracker',
    icon: LayoutGrid,
    href: '/',
    body:
      'Tours, shows, products and stock. Documents (purchase orders, packing lists, sales reports, settlements) are uploaded here, read by AI, checked against GMS business rules and posted after review.',
  },
  {
    name: 'MerchFlow Charts',
    icon: BarChart3,
    href: CHARTS_URL,
    body:
      'Tour sales chart reports built from tracker data. Reports are published as password-protected links with an A3 PDF export.',
  },
  {
    name: 'MerchFlow POS',
    icon: Tablet,
    href: '/pos',
    body:
      'iPad point of sale. Records sales, comps and stock counts at the table and writes them to the same database. In testing.',
  },
];

export default function WelcomePage() {
  return (
    <div className="py-8 space-y-12 max-w-6xl">
      <header className="space-y-4">
        <MerchFlowWordmark className="h-14 w-auto text-[var(--color-text-primary)]" />
        <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px] lg:leading-9">How MerchFlow works</h1>
        <p className="text-[15px] text-[var(--color-text-secondary)] max-w-[70ch]">
          MerchFlow is three apps for Global Merchandising Services tours. They share one database, so
          data entered or uploaded in one is available in the others.
        </p>
        <WelcomeActions />
      </header>

      <section aria-labelledby="chapters-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="chapters-heading" className="text-xl font-semibold">Guided tour</h2>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-3xl">
            The tour opens each screen in turn and names the manual work it replaces. Start at any
            chapter.
          </p>
        </div>
        <TourChapterList />
      </section>

      <section aria-labelledby="apps-heading" className="space-y-4">
        <h2 id="apps-heading" className="text-xl font-semibold">The apps</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {APPS.map((app) => {
            const Icon = app.icon;
            return (
              <a
                key={app.name}
                href={app.href}
                className="g-card p-5 block space-y-2 transition-colors hover:border-[var(--color-text-muted)]"
              >
                <h3 className="font-semibold flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--color-red-primary)]" aria-hidden="true" />
                  {app.name}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">{app.body}</p>
              </a>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="flow-heading" className="space-y-6">
        <div className="space-y-2">
          <h2 id="flow-heading" className="text-xl font-semibold">Manual entry: current process and options</h2>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-3xl">
            In both options, AI extracts fields from documents; validation and posting follow GMS
            business rules, with a review step for flagged items.
          </p>
        </div>

        <FlowTiles data-tour="welcome-counts" />

        <FlowDiagrams />

        <aside data-tour="welcome-ai" className="mfd-ai mfd-s-ai">
          <h3>
            <span className="mfd-marker" aria-hidden="true">
              AI
            </span>
            Role of AI
          </h3>
          <p>{AI_NOTE}</p>
        </aside>

        <p className="text-sm text-[var(--color-text-secondary)]">
          Full comparison:{' '}
          <a href={FLOW_URL} className="underline underline-offset-2 hover:text-[var(--color-text-primary)]">
            MerchFlow Data Flow
          </a>
        </p>
      </section>
    </div>
  );
}
