import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/Button';
import { PosLaunch } from '@/components/onboarding/PosLaunch';
import { FLOW_URL } from '@/lib/apps';

export const metadata: Metadata = {
  title: 'MerchFlow POS · MerchFlow Tracker',
  description: 'MerchFlow POS, the iPad point of sale for Global Merchandising Services tours.',
};

const FEATURES = [
  'Sales recorded at the merch table. Card payments through Stripe Terminal are planned; cash and manual entry work now.',
  'Comps (GMS and band) logged at hand-off.',
  'Count-in and count-out for each show.',
  'Packing lists scanned at receiving.',
  'Sales, comps and counts are written directly to the MerchFlow database, so the Tracker and Charts see them without exports.',
  'Settlements are built per show from POS sales and comps.',
];

export default function PosPage() {
  return (
    <div className="py-8 space-y-8 max-w-4xl">
      <header className="space-y-3" data-tour="pos-intro">
        <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px] lg:leading-9">MerchFlow POS</h1>
        <p className="text-[15px] text-[var(--color-text-secondary)] max-w-3xl">
          MerchFlow POS is an iPad point-of-sale app for tour merch tables. It replaces AtVenu in
          Option B of the{' '}
          <a href={`${FLOW_URL}/#option-b`} className="underline underline-offset-2 hover:text-[var(--color-text-primary)]">
            data flow
          </a>
          : sales, comps and stock counts go straight into the database instead of being exported
          and typed in.
        </p>
      </header>

      <PosLaunch />

      <section className="g-card p-5 space-y-3" data-tour="pos-demo">
        <h2 className="text-lg font-semibold">Interactive demo</h2>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-3xl">
          A clickable iPad mock of the app in your browser: setup, a sale by card, cash or split,
          comps, and closing the show with count-out and settlement. It uses this tour&apos;s
          products. Nothing is saved.
        </p>
        <Link
          href="/pos/demo"
          className={buttonVariants()}
        >
          Open the interactive demo
        </Link>
      </section>

      <section className="g-card p-5 space-y-3" data-tour="pos-features">
        <h2 className="text-lg font-semibold">What it does</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-[var(--color-text-secondary)]">
          {FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <section className="g-card p-5 space-y-3">
        <h2 className="text-lg font-semibold">Status</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-[var(--color-text-secondary)]">
          <li>In testing. Distribution to testers will be through Apple TestFlight.</li>
          <li>Card payments (Stripe Terminal) and offline sync are still to be built.</li>
          <li>The plan is a pilot on one tour leg alongside AtVenu.</li>
        </ul>
      </section>
    </div>
  );
}
